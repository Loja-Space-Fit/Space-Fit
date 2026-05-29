import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmailConfirmacaoPedido, enviarEmailProntoParaRetirada } from '@/lib/email'
import { processLoyaltyPoints } from '@/lib/loyalty'
import type { Order } from '@/types'

// Webhook do Mercado Pago — chamado automaticamente quando o pagamento muda de status
export async function POST(req: NextRequest) {
  try {
    let body: { type?: string; topic?: string; data?: { id?: string }; [key: string]: unknown } = {}
    try {
      body = await req.json()
    } catch {
      // Corpo vazio ou não-JSON — tudo bem, responder 200
      return NextResponse.json({ received: true })
    }

    // Pings de teste do Mercado Pago (sem type/topic) — confirmar imediatamente, sem HMAC
    if (!body.type && !body.topic) {
      return NextResponse.json({ received: true })
    }

    // Verificar assinatura HMAC do Mercado Pago
    // Se o secret estiver configurado, a assinatura é obrigatória para todos os eventos reais
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

    // Processar notificação
    if (body.type === 'payment' && body.data?.id) {
      const supabase = createServiceClient()
      const mpPaymentId = String(body.data.id)

      // Buscar detalhes do pagamento na API do MP
      const mpRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          },
        }
      )

      if (!mpRes.ok) {
        console.error('Erro ao buscar pagamento no MP:', await mpRes.text())
        return NextResponse.json({ ok: false }, { status: 200 }) // Retornar 200 para MP não reenviar
      }

      const payment = await mpRes.json()
      const mpStatus = payment.status // approved | rejected | pending | cancelled | refunded

      // Mapear status do MP → status interno
      const statusMap: Record<string, { payment_status: string; order_status: string }> = {
        approved: { payment_status: 'approved', order_status: 'paid' },
        rejected: { payment_status: 'rejected', order_status: 'cancelled' },
        refunded: { payment_status: 'refunded', order_status: 'cancelled' },
        cancelled: { payment_status: 'rejected', order_status: 'cancelled' },
        pending:   { payment_status: 'pending',  order_status: 'pending' },
      }

      const mapped = statusMap[mpStatus] || { payment_status: 'pending', order_status: 'pending' }

      // Encontrar pedido pelo external_reference (order_id) ou pelo mp_payment_id
      const externalRef = payment.external_reference
      let query = supabase.from('orders').select('id').eq('mp_payment_id', mpPaymentId)
      if (externalRef) {
        query = supabase.from('orders').select('id').eq('id', externalRef)
      }

      const { data: orders } = await query
      if (orders && orders.length > 0) {
        const orderId = orders[0].id

        // Buscar estado atual antes de atualizar (idempotência — evita processar duas vezes)
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

        // Transição → aprovado: dispara loyalty, email e incrementa cupom
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

            // Incrementar uso do cupom somente após pagamento confirmado
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

        // Transição → rejeitado: restaurar estoque se ainda não foi restaurado pela página de confirmação
        // (a página pode ter chegado primeiro e já restaurado — a guard evita dupla restauração)
        if (mapped.payment_status === 'rejected') {
          const { data: pedidoCompleto } = await supabase
            .from('orders')
            .select('items')
            .eq('id', orderId)
            .single()

          // Só restaura se o order ainda estava 'pending' ANTES deste webhook (pedidoAtual)
          // Se a página de confirmação já processou, pedidoAtual.payment_status já será 'rejected'
          if (pedidoCompleto && pedidoAtual?.payment_status === 'pending') {
            const orderItems = (pedidoCompleto?.items || []) as Array<{ product_id: string; quantity: number; size?: string }>
            for (const item of orderItems) {
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
              } else {
                const { data: product } = await supabase
                  .from('products')
                  .select('id, stock, size_stock')
                  .eq('id', item.product_id)
                  .maybeSingle()
                if (product) {
                  const hasSizeStock = product.size_stock && Object.keys(product.size_stock).length > 0
                  if (hasSizeStock && item.size) {
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
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 200 }) // 200 para evitar retentativas do MP
  }
}
