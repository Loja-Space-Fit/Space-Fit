import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmailConfirmacaoPedido, enviarEmailProntoParaRetirada } from '@/lib/email'
import { processLoyaltyPoints } from '@/lib/loyalty'
import type { Order } from '@/types'

// Restaura estoque de um item do pedido (produto simples, tamanho, sabor ou variação combo)
async function restoreItemStock(
  supabase: ReturnType<typeof createServiceClient>,
  item: { product_id: string; quantity: number; size?: string; flavor?: string }
) {
  // Tenta bundle primeiro
  const { data: bundle } = await supabase
    .from('bundles')
    .select('id, stock')
    .eq('id', item.product_id)
    .maybeSingle()

  if (bundle) {
    await supabase
      .from('bundles')
      .update({ stock: bundle.stock + item.quantity })
      .eq('id', item.product_id)
    return
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, stock, size_stock, flavor_stock, sizes, flavors')
    .eq('id', item.product_id)
    .maybeSingle()

  if (!product) return

  const hasSizes   = Array.isArray(product.sizes)   && product.sizes.length   > 0
  const hasFlavors = Array.isArray(product.flavors) && product.flavors.length > 0
  const isCombo    = hasSizes && hasFlavors

  if (isCombo && item.size && item.flavor) {
    // Variação combo — restaura a variação específica
    const { data: variation } = await supabase
      .from('product_variations')
      .select('stock')
      .eq('product_id', item.product_id)
      .eq('size', item.size)
      .eq('flavor', item.flavor)
      .maybeSingle()

    if (variation) {
      await supabase
        .from('product_variations')
        .update({ stock: variation.stock + item.quantity })
        .eq('product_id', item.product_id)
        .eq('size', item.size)
        .eq('flavor', item.flavor)
    }

    // Recalcula stock global
    const { data: allVariations } = await supabase
      .from('product_variations')
      .select('stock')
      .eq('product_id', item.product_id)
    const totalStock = (allVariations ?? []).reduce((s: number, v: { stock: number }) => s + v.stock, 0)
    await supabase.from('products').update({ stock: totalStock }).eq('id', item.product_id)

  } else if (!isCombo && hasSizes && item.size) {
    // Tamanho apenas
    const hasSizeStock = product.size_stock && Object.keys(product.size_stock).length > 0
    if (hasSizeStock) {
      const updated = { ...(product.size_stock as Record<string, number>) }
      updated[item.size] = (updated[item.size] ?? 0) + item.quantity
      const newTotal = Object.values(updated).reduce((a, b) => a + b, 0)
      await supabase
        .from('products')
        .update({ size_stock: updated, stock: newTotal })
        .eq('id', item.product_id)
    } else {
      await supabase
        .from('products')
        .update({ stock: product.stock + item.quantity })
        .eq('id', item.product_id)
    }

  } else if (!isCombo && hasFlavors && item.flavor) {
    // Sabor apenas
    const hasFlavorStock = product.flavor_stock && Object.keys(product.flavor_stock).length > 0
    if (hasFlavorStock) {
      const updated = { ...(product.flavor_stock as Record<string, number>) }
      updated[item.flavor] = (updated[item.flavor] ?? 0) + item.quantity
      const newTotal = Object.values(updated).reduce((a, b) => a + b, 0)
      await supabase
        .from('products')
        .update({ flavor_stock: updated, stock: newTotal })
        .eq('id', item.product_id)
    } else {
      await supabase
        .from('products')
        .update({ stock: product.stock + item.quantity })
        .eq('id', item.product_id)
    }

  } else {
    // Produto simples
    await supabase
      .from('products')
      .update({ stock: product.stock + item.quantity })
      .eq('id', item.product_id)
  }
}

// Webhook do Mercado Pago — chamado automaticamente quando o pagamento muda de status
export async function POST(req: NextRequest) {
  try {
    let body: { type?: string; topic?: string; data?: { id?: string }; [key: string]: unknown } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ received: true })
    }

    // Pings de teste do Mercado Pago (sem type/topic)
    if (!body.type && !body.topic) {
      return NextResponse.json({ received: true })
    }

    // Verificar assinatura HMAC do Mercado Pago
    const mpSignature = req.headers.get('x-signature')
    const mpRequestId = req.headers.get('x-request-id')
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET

    if (secret) {
      if (!mpSignature || !mpRequestId || !body.data?.id) {
        console.warn('[webhook] Signature headers ausentes — requisição rejeitada')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const ts = mpSignature.match(/ts=(\d+)/)?.[1]
      const signatureValue = mpSignature.match(/v1=([a-f0-9]+)/)?.[1]

      if (!ts || !signatureValue) {
        console.warn('[webhook] Formato de assinatura inválido')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { createHmac } = await import('crypto')
      const manifest = `id:${body.data.id};request-id:${mpRequestId};ts:${ts};`
      const expectedSignature = createHmac('sha256', secret)
        .update(manifest)
        .digest('hex')

      if (expectedSignature !== signatureValue) {
        console.warn('[webhook] Assinatura HMAC inválida')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      console.warn('[webhook] MERCADOPAGO_WEBHOOK_SECRET não configurado — validação HMAC desabilitada')
    }

    if (body.type === 'payment' && body.data?.id) {
      const supabase = createServiceClient()
      const mpPaymentId = String(body.data.id)

      const mpRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
        { headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` } }
      )

      if (!mpRes.ok) {
        console.error('Erro ao buscar pagamento no MP:', await mpRes.text())
        return NextResponse.json({ ok: false }, { status: 200 })
      }

      const payment = await mpRes.json()
      const mpStatus = payment.status

      const statusMap: Record<string, { payment_status: string; order_status: string }> = {
        approved: { payment_status: 'approved', order_status: 'paid' },
        rejected: { payment_status: 'rejected', order_status: 'cancelled' },
        refunded: { payment_status: 'refunded', order_status: 'cancelled' },
        cancelled: { payment_status: 'rejected', order_status: 'cancelled' },
        pending:   { payment_status: 'pending',  order_status: 'pending' },
      }

      const mapped = statusMap[mpStatus] || { payment_status: 'pending', order_status: 'pending' }

      const externalRef = payment.external_reference
      let query = supabase.from('orders').select('id').eq('mp_payment_id', mpPaymentId)
      if (externalRef) {
        query = supabase.from('orders').select('id').eq('id', externalRef)
      }

      const { data: orders } = await query
      if (orders && orders.length > 0) {
        const orderId = orders[0].id

        const { data: pedidoAtual } = await supabase
          .from('orders')
          .select('payment_status, order_status')
          .eq('id', orderId)
          .single()

        await supabase
          .from('orders')
          .update({
            mp_payment_id:  mpPaymentId,
            payment_status: mapped.payment_status,
            order_status:   mapped.order_status,
          })
          .eq('id', orderId)

        // Aprovado: dispara loyalty, email, incrementa cupom
        if (mapped.payment_status === 'approved' && pedidoAtual?.payment_status !== 'approved') {
          const { data: pedidoCompleto } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()

          if (pedidoCompleto) {
            await processLoyaltyPoints(orderId, supabase)

            const emailFn = pedidoCompleto.payment_method === 'pickup'
              ? enviarEmailProntoParaRetirada
              : enviarEmailConfirmacaoPedido
            emailFn(pedidoCompleto as Order).catch(e =>
              console.error('[webhook] Falha ao enviar email de confirmacao:', e)
            )

            if (pedidoCompleto.coupon_code) {
              const { data: cupom } = await supabase
                .from('coupons')
                .select('uses_count')
                .eq('code', pedidoCompleto.coupon_code)
                .single()
              if (cupom) {
                await supabase
                  .from('coupons')
                  .update({ uses_count: (cupom.uses_count || 0) + 1 })
                  .eq('code', pedidoCompleto.coupon_code)
              }
            }
          }
        }

        // Rejeitado: restaurar estoque se pedido ainda estava pendente
        if (mapped.payment_status === 'rejected' && pedidoAtual?.payment_status === 'pending') {
          const { data: pedidoCompleto } = await supabase
            .from('orders')
            .select('items')
            .eq('id', orderId)
            .single()

          if (pedidoCompleto) {
            const orderItems = (pedidoCompleto.items || []) as Array<{
              product_id: string; quantity: number; size?: string; flavor?: string
            }>
            for (const item of orderItems) {
              await restoreItemStock(supabase, item)
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 200 })
  }
}
