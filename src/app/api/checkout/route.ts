import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { getPreferenceClient } from '@/lib/mercadopago'
import { processLoyaltyPoints } from '@/lib/loyalty'
import { enviarEmailConfirmacaoPedido, enviarEmailProntoParaRetirada } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customer_name, customer_phone, customer_email,
      address, items, subtotal, discount, shipping, total,
      payment_method, coupon_code, points_to_use,
      delivery_type, pickup_location,
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

    // Validar estoque, capturar preços reais e guardar valores atuais
    const stockMap  = new Map<string, number>()
    const bundleIds = new Map<string, number>()
    const priceMap  = new Map<string, number>() // product_id → preço real do banco

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        return NextResponse.json({ error: 'Item inválido no carrinho' }, { status: 400 })
      }

      const { data: product } = await supabase
        .from('products')
        .select('id, stock, name, price, active')
        .eq('id', item.product_id)
        .single()

      if (product) {
        if (!product.active) {
          return NextResponse.json({ error: `Produto "${product.name}" não está disponível` }, { status: 400 })
        }
        if (product.stock < item.quantity) {
          return NextResponse.json({
            error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`
          }, { status: 400 })
        }
        stockMap.set(item.product_id, product.stock)
        priceMap.set(item.product_id, product.price)
      } else {
        const { data: bundle } = await supabase
          .from('bundles')
          .select('id, name, active, stock, price')
          .eq('id', item.product_id)
          .single()

        if (!bundle) {
          return NextResponse.json({ error: `Produto não encontrado: ${item.product_name}` }, { status: 400 })
        }
        if (!bundle.active) {
          return NextResponse.json({ error: `O kit "${bundle.name}" não está disponível no momento.` }, { status: 400 })
        }
        if (bundle.stock < item.quantity) {
          return NextResponse.json({ error: `Kit "${bundle.name}" sem estoque suficiente.` }, { status: 400 })
        }
        bundleIds.set(item.product_id, bundle.stock)
        priceMap.set(item.product_id, bundle.price)
      }
    }

    // --- Recalcular todos os valores no servidor (nunca confiar no cliente) ---

    // Subtotal real baseado nos preços do banco
    let serverSubtotal = 0
    const serverItems = items.map((item: { product_id: string; quantity: number; product_name?: string; product_image?: string; size?: string }) => {
      const actualPrice = priceMap.get(item.product_id) ?? 0
      serverSubtotal += actualPrice * item.quantity
      return { ...item, unit_price: actualPrice, total_price: Math.round(actualPrice * item.quantity * 100) / 100 }
    })
    serverSubtotal = Math.round(serverSubtotal * 100) / 100

    // Desconto real do cupom
    let serverDiscount = 0
    if (coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('type, value, min_order, max_uses, uses_count, expires_at, active')
        .eq('code', coupon_code.toUpperCase())
        .eq('active', true)
        .single()
      if (!coupon) {
        return NextResponse.json({ error: 'Cupom inválido ou expirado' }, { status: 400 })
      }
      const now = new Date()
      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        return NextResponse.json({ error: 'Cupom expirado' }, { status: 400 })
      }
      if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
        return NextResponse.json({ error: 'Cupom esgotado' }, { status: 400 })
      }
      if (serverSubtotal < coupon.min_order) {
        return NextResponse.json({
          error: `Pedido mínimo de R$ ${Number(coupon.min_order).toFixed(2).replace('.', ',')} para usar este cupom`
        }, { status: 400 })
      }
      serverDiscount = coupon.type === 'percent'
        ? Math.round(serverSubtotal * coupon.value / 100 * 100) / 100
        : Math.min(coupon.value, serverSubtotal)
    }

    // Pontos de fidelidade: validar saldo real do usuário (1 ponto = R$ 1,00)
    let serverPointsDiscount = 0
    let validatedPointsToUse = 0
    if (points_to_use && points_to_use > 0 && userId) {
      const { data: loyaltyAccount } = await supabase
        .from('loyalty_accounts')
        .select('points')
        .eq('user_id', userId)
        .single()
      const available = loyaltyAccount?.points ?? 0
      const afterCoupon = Math.max(0, serverSubtotal - serverDiscount)
      validatedPointsToUse = Math.min(points_to_use, available, Math.floor(afterCoupon))
      serverPointsDiscount = validatedPointsToUse
    }

    // Frete: recalcular server-side a partir do UF do endereço
    let serverShipping = 0
    if (delivery_type === 'pickup') {
      serverShipping = 0
    } else {
      const uf = String(address?.state || '').toUpperCase().slice(0, 2)
      if (!uf || uf.length !== 2) {
        return NextResponse.json({ error: 'Endereço de entrega inválido ou incompleto' }, { status: 400 })
      }
      const [{ data: shippingRate }, { data: shippingSettings }] = await Promise.all([
        supabase.from('shipping_rates').select('price').eq('uf', uf).single(),
        supabase.from('store_settings').select('key, value').in('key', ['free_shipping_threshold']),
      ])
      const threshold = parseFloat(
        (shippingSettings as Array<{ key: string; value: string }> | null)
          ?.find(s => s.key === 'free_shipping_threshold')?.value || '299'
      )
      const afterDiscounts = Math.max(0, serverSubtotal - serverDiscount - serverPointsDiscount)
      serverShipping = afterDiscounts >= threshold ? 0 : (shippingRate ? Number(shippingRate.price) : 35.90)
    }

    // Total final do servidor
    const serverTotal = Math.max(0, Math.round(
      (serverSubtotal - serverDiscount - serverPointsDiscount + serverShipping) * 100
    ) / 100)

    // Criar pedido com valores calculados no servidor
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        address: address || null,
        items: serverItems,
        subtotal: serverSubtotal,
        discount: serverDiscount,
        shipping: serverShipping,
        total: serverTotal,
        payment_method,
        payment_status: 'pending',
        order_status: 'pending',
        coupon_code: coupon_code || null,
        user_id: userId,
        points_to_use: validatedPointsToUse,
        points_earned: Math.round(serverTotal * 0.01 * 100) / 100,
        points_processed: false,
        pickup_location: pickup_location || null,
      })
      .select('id, order_number')
      .single()

    if (error) {
      console.error('Erro ao criar pedido:', error)
      return NextResponse.json({ error: 'Erro ao salvar pedido' }, { status: 500 })
    }

    // Decrementar estoque imediatamente ao criar o pedido (para todos os métodos).
    // Se o pagamento for recusado ou cancelado, o estoque é restaurado no webhook/rota de cancelamento.
    for (const item of items) {
      if (bundleIds.has(item.product_id)) {
        const currentStock = bundleIds.get(item.product_id) ?? 0
        await supabase
          .from('bundles')
          .update({ stock: Math.max(0, currentStock - item.quantity) })
          .eq('id', item.product_id)
      } else {
        const currentStock = stockMap.get(item.product_id) ?? 0
        await supabase
          .from('products')
          .update({ stock: Math.max(0, currentStock - item.quantity) })
          .eq('id', item.product_id)
      }
    }

    // Nota: o uso do cupom (uses_count) só é incrementado após aprovação do pagamento (no webhook)

    // Criar preferência de pagamento no Mercado Pago (apenas para pagamentos online)
    if (payment_method === 'pickup') {
      // Pedido de retirada: aprovar imediatamente, incrementar cupom e enviar email
      await supabase
        .from('orders')
        .update({ payment_status: 'approved', order_status: 'paid' })
        .eq('id', order.id)

      if (coupon_code) {
        const { data: cupom } = await supabase
          .from('coupons').select('uses_count').eq('code', coupon_code).single()
        if (cupom) {
          await supabase
            .from('coupons')
            .update({ uses_count: (cupom.uses_count || 0) + 1 })
            .eq('code', coupon_code)
        }
      }

      await processLoyaltyPoints(order.id, supabase)

      const { data: pedidoRetirada } = await supabase.from('orders').select('*').eq('id', order.id).single()
      if (pedidoRetirada) {
        enviarEmailProntoParaRetirada(pedidoRetirada as import('@/types').Order).catch(() => {})
      }

      return NextResponse.json({ order_id: order.id, order_number: order.order_number })
    }

    if (payment_method !== 'pickup') {
      // Pedido gratuito (cupom 100%) — aprovar diretamente sem passar pelo MP
      if (Number(serverTotal) <= 0) {
        await supabase
          .from('orders')
          .update({ payment_status: 'approved', order_status: 'paid' })
          .eq('id', order.id)

        // Incrementar uso do cupom
        if (coupon_code) {
          const { data: cupom } = await supabase
            .from('coupons').select('uses_count').eq('code', coupon_code).single()
          if (cupom) {
            await supabase
              .from('coupons')
              .update({ uses_count: (cupom.uses_count || 0) + 1 })
              .eq('code', coupon_code)
          }
        }

        // Processar pontos de fidelidade
        await processLoyaltyPoints(order.id, supabase)

        // Enviar email de confirmação
        const { data: pedidoAprovado } = await supabase.from('orders').select('*').eq('id', order.id).single()
        if (pedidoAprovado) {
          const emailFn = payment_method === 'pickup'
            ? enviarEmailProntoParaRetirada
            : enviarEmailConfirmacaoPedido
          emailFn(pedidoAprovado as import('@/types').Order).catch(() => {})
        }

        return NextResponse.json({ order_id: order.id, order_number: order.order_number })
      }

      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
        const isSandbox = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').startsWith('TEST-')
        const preferenceClient = getPreferenceClient()

        // Calcula o total real a cobrar (calculado no servidor)
        const totalFinal = serverTotal

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
              // Não usar o email da conta do vendedor como payer (MP bloqueia).
              // Para qualquer outro email real do cliente, usar normalmente.
              email: customer_email && customer_email !== process.env.RESEND_FROM_EMAIL
                ? customer_email
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

        // Salvar mp_preference_id no pedido
        await supabase
          .from('orders')
          .update({ mp_preference_id: preference.id })
          .eq('id', order.id)

        return NextResponse.json({
          order_id: order.id,
          order_number: order.order_number,
          payment_url: isSandbox ? preference.sandbox_init_point : preference.init_point,
        })
      } catch (mpError) {
        const mpMsg = mpError instanceof Error ? mpError.message : JSON.stringify(mpError)
        console.error('Erro ao criar preferência Mercado Pago:', mpMsg)
        return NextResponse.json(
          { error: 'Não foi possível iniciar o pagamento. Tente novamente em instantes.', order_id: order.id },
          { status: 502 }
        )
      }
    } // fim if payment_method !== 'pickup'

    return NextResponse.json({ order_id: order.id, order_number: order.order_number })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
