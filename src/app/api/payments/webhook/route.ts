import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmailConfirmacaoPedido } from '@/lib/email'
import { processLoyaltyPoints } from '@/lib/loyalty'
import type { Order } from '@/types'

// Webhook do Mercado Pago — chamado automaticamente quando o pagamento muda de status
export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {}
    try {
      body = await req.json()
    } catch {
      // Corpo vazio ou não-JSON — tudo bem, responder 200
      return NextResponse.json({ received: true })
    }

    // Verificar assinatura HMAC do Mercado Pago (quando disponível)
    const mpSignature = req.headers.get('x-signature')
    const mpRequestId = req.headers.get('x-request-id')
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET

    if (secret && mpSignature) {
      const ts = mpSignature.match(/ts=(\d+)/)?.[1]
      const signatureValue = mpSignature.match(/v1=([a-f0-9]+)/)?.[1]

      if (ts && signatureValue) {
        const { createHmac } = await import('crypto')
        const dataId = body.data?.id
        const manifest = `id:${dataId};request-id:${mpRequestId};ts:${ts};`
        const expectedSignature = createHmac('sha256', secret)
          .update(manifest)
          .digest('hex')

        if (expectedSignature !== signatureValue) {
          console.warn('Assinatura do webhook inválida')
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }
    }

    // Corpo vazio ou ping de teste do Mercado Pago — apenas confirmar recebimento
    if (!body.type && !body.topic) {
      return NextResponse.json({ received: true })
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
        await supabase
          .from('orders')
          .update({
            mp_payment_id:  mpPaymentId,
            payment_status: mapped.payment_status,
            order_status:   mapped.order_status,
          })
          .eq('id', orders[0].id)

        // Envia email de confirmacao quando o pagamento e aprovado
        if (mapped.payment_status === 'approved') {
          const { data: pedidoCompleto } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orders[0].id)
            .single()

          if (pedidoCompleto) {
            // Processar pontos de fidelidade
            await processLoyaltyPoints(orders[0].id, supabase)

            // Sem await intencional — nao queremos bloquear a resposta do webhook por causa do email
            enviarEmailConfirmacaoPedido(pedidoCompleto as Order).catch(e =>
              console.error('[webhook] Falha ao enviar email de confirmacao:', e)
            )
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
