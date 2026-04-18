import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { getPreferenceClient } from '@/lib/mercadopago'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customer_name, customer_phone, customer_email,
      address, items, subtotal, discount, total,
      payment_method, coupon_code, points_to_use,
    } = body

    // Validação básica
    if (!customer_name || !customer_phone || !items?.length || !payment_method) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    // Obter user_id do cliente logado (se houver sessão)
    let userId: string | null = null
    try {
      const userClient = await createClient()
      const { data: { user } } = await userClient.auth.getUser()
      if (user) userId = user.id
    } catch { /* usuário não logado — pedido como visitante */ }

    const supabase = createServiceClient()

    // Validar estoque e guardar valores atuais
    const stockMap = new Map<string, number>()
    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('id, stock, name')
        .eq('id', item.product_id)
        .single()

      if (!product) {
        return NextResponse.json({ error: `Produto não encontrado: ${item.product_name}` }, { status: 400 })
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({
          error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`
        }, { status: 400 })
      }
      stockMap.set(item.product_id, product.stock)
    }

    // Criar pedido
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        address: address || null,
        items,
        subtotal,
        discount: discount || 0,
        shipping: 0,
        total,
        payment_method,
        payment_status: 'pending',
        order_status: 'pending',
        coupon_code: coupon_code || null,
        user_id: userId,
        points_to_use: points_to_use || 0,
        points_earned: Math.round(total * 0.01 * 100) / 100,
        points_processed: false,
      })
      .select('id, order_number')
      .single()

    if (error) {
      console.error('Erro ao criar pedido:', error)
      return NextResponse.json({ error: 'Erro ao salvar pedido' }, { status: 500 })
    }

    // Decrementar estoque
    for (const item of items) {
      const currentStock = stockMap.get(item.product_id) ?? 0
      await supabase
        .from('products')
        .update({ stock: Math.max(0, currentStock - item.quantity) })
        .eq('id', item.product_id)
    }

    // Incrementar uso do cupom
    if (coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('uses_count')
        .eq('code', coupon_code)
        .single()
      if (coupon) {
        await supabase
          .from('coupons')
          .update({ uses_count: (coupon.uses_count || 0) + 1 })
          .eq('code', coupon_code)
      }
    }

    // Criar preferência de pagamento no Mercado Pago (apenas para pagamentos online)
    if (payment_method !== 'pickup') {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        const isLocal = siteUrl.includes('localhost')
        const preferenceClient = getPreferenceClient()

        // Calcula o total real a cobrar (já com descontos)
        const totalFinal = Number(total)

        const preference = await preferenceClient.create({
          body: {
            items: [{
              id: 'pedido',
              title: `Pedido Space Fit #${order.order_number}`,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: totalFinal,
            }],
            payer: {
              name: customer_name,
              email: customer_email || 'cliente@spacefit.com.br',
            },
            external_reference: order.id,
            back_urls: {
              success: `${siteUrl}/pedido-confirmado/${order.id}`,
              failure: `${siteUrl}/pedido-confirmado/${order.id}`,
              pending: `${siteUrl}/pedido-confirmado/${order.id}`,
            },
            ...(!isLocal && { auto_return: 'all' }),
            ...(!isLocal && { notification_url: `${siteUrl}/api/payments/webhook` }),
          },
        })

        // Salvar mp_preference_id no pedido
        await supabase
          .from('orders')
          .update({ mp_preference_id: preference.id })
          .eq('id', order.id)

        return NextResponse.json({
          order_id: order.id,
          order_number: order.order_number,
          payment_url: preference.init_point,
        })
      } catch (mpError) {
        console.error('Erro ao criar preferência Mercado Pago:', mpError)
        // Retorna erro explícito para o frontend saber que o pagamento não foi iniciado
        return NextResponse.json(
          { error: 'Não foi possível iniciar o pagamento. Tente novamente em instantes.', order_id: order.id },
          { status: 502 }
        )
      }
    }

    return NextResponse.json({ order_id: order.id, order_number: order.order_number })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
