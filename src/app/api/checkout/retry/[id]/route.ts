import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getPreferenceClient } from '@/lib/mercadopago'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_email, total, payment_method, payment_status')
    .eq('id', id)
    .single()

  if (error || !order) {
    return NextResponse.redirect(new URL('/checkout', process.env.NEXT_PUBLIC_SITE_URL!))
  }

  // Só permite retry em pedidos recusados
  if (order.payment_status !== 'rejected') {
    return NextResponse.redirect(
      new URL(`/pedido-confirmado/${id}`, process.env.NEXT_PUBLIC_SITE_URL!)
    )
  }

  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const isLocal = siteUrl.includes('localhost')
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
          email: order.customer_email || 'cliente@spacefit.com.br',
        },
        external_reference: order.id,
        back_urls: {
          success: `${siteUrl}/pedido-confirmado/${order.id}`,
          failure: `${siteUrl}/pedido-confirmado/${order.id}?mp_result=failure`,
          pending: `${siteUrl}/pedido-confirmado/${order.id}`,
        },
        ...(!isLocal && { auto_return: 'approved' }),
        ...(!isLocal && { notification_url: `${siteUrl}/api/payments/webhook` }),
      },
    })

    // Resetar status para pendente com nova preferência
    await supabase
      .from('orders')
      .update({ mp_preference_id: preference.id, payment_status: 'pending' })
      .eq('id', order.id)

    return NextResponse.redirect(preference.init_point!)
  } catch (e) {
    console.error('[retry] Erro ao criar preferência:', e)
    return NextResponse.redirect(
      new URL(`/pedido-confirmado/${id}`, process.env.NEXT_PUBLIC_SITE_URL!)
    )
  }
}
