import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { getPreferenceClient } from '@/lib/mercadopago'
import { processLoyaltyPoints } from '@/lib/loyalty'
import { enviarEmailConfirmacaoPedido, enviarEmailProntoParaRetirada } from '@/lib/email'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_email, total, payment_method, payment_status, user_id')
    .eq('id', id)
    .single()

  if (error || !order) {
    return NextResponse.redirect(new URL('/checkout', process.env.NEXT_PUBLIC_SITE_URL!))
  }

  // Se o pedido pertence a um usuário autenticado, verificar ownership
  if (order.user_id) {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user || user.id !== order.user_id) {
      return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL!))
    }
  } else {
    // Pedidos de visitante não permitem retry — redirecionar para novo checkout
    return NextResponse.redirect(new URL('/checkout', process.env.NEXT_PUBLIC_SITE_URL!))
  }

  // Só permite retry em pedidos pendentes ou recusados
  if (order.payment_status !== 'rejected' && order.payment_status !== 'pending') {
    return NextResponse.redirect(
      new URL(`/pedido-confirmado/${id}`, process.env.NEXT_PUBLIC_SITE_URL!)
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  // Pedido gratuito (cupom 100%) — aprovar diretamente sem passar pelo MP
  if (Number(order.total) <= 0) {
    await supabase
      .from('orders')
      .update({ payment_status: 'approved', order_status: 'paid' })
      .eq('id', order.id)

    // Incrementar uso do cupom
    const { data: pedidoCompleto } = await supabase
      .from('orders').select('coupon_code').eq('id', order.id).single()
    if (pedidoCompleto?.coupon_code) {
      const { data: cupom } = await supabase
        .from('coupons').select('uses_count').eq('code', pedidoCompleto.coupon_code).single()
      if (cupom) {
        await supabase
          .from('coupons')
          .update({ uses_count: (cupom.uses_count || 0) + 1 })
          .eq('code', pedidoCompleto.coupon_code)
      }
    }

    // Processar pontos de fidelidade
    await processLoyaltyPoints(order.id, supabase)

    // Enviar email de confirmação
    const { data: pedidoAprovado } = await supabase.from('orders').select('*').eq('id', order.id).single()
    if (pedidoAprovado) {
      const emailFn = pedidoAprovado.payment_method === 'pickup'
        ? enviarEmailProntoParaRetirada
        : enviarEmailConfirmacaoPedido
      emailFn(pedidoAprovado as import('@/types').Order).catch(() => {})
    }

    return NextResponse.redirect(new URL(`/pedido-confirmado/${order.id}`, siteUrl))
  }

  try {
    const isSandbox = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').startsWith('TEST-')
    const preferenceClient = getPreferenceClient()

    const preference = await preferenceClient.create({
      body: {
        items: [{
          id: 'pedido',
          title: `Pedido Space Fit #${order.order_number}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(order.total),
        }],
        payer: {
          name: order.customer_name,
          // Não usar o email da conta do vendedor como payer (MP bloqueia).
          email: order.customer_email && order.customer_email !== process.env.RESEND_FROM_EMAIL
            ? order.customer_email
            : 'comprador@mp.com.br',
        },
        external_reference: order.id,
        back_urls: {
          success: `${siteUrl}/pedido-confirmado/${order.id}`,
          failure: `${siteUrl}/pedido-confirmado/${order.id}?mp_result=failure`,
          pending: `${siteUrl}/pedido-confirmado/${order.id}`,
        },
        ...(!isSandbox && { auto_return: 'approved' }),
        notification_url: `${siteUrl}/api/payments/webhook`,
      },
    })

    // Resetar status para pendente com nova preferência
    await supabase
      .from('orders')
      .update({ mp_preference_id: preference.id, payment_status: 'pending' })
      .eq('id', order.id)

    return NextResponse.redirect(isSandbox ? preference.sandbox_init_point! : preference.init_point!)
  } catch (e) {
    console.error('[retry] Erro ao criar preferência:', e)
    return NextResponse.redirect(new URL(`/pedido-confirmado/${id}`, siteUrl))
  }
}
