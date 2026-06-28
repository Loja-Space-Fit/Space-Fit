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

    if (!customer_name || !customer_phone || !items?.length || !payment_method) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    let userId: string | null = null
    try {
      const userClient = await createClient()
      const { data: { user } } = await userClient.auth.getUser()
      if (user) userId = user.id
    } catch { /* usuário não logado */ }

    const supabase = createServiceClient()

    // Maps de estoque por tipo de produto
    const stockMap        = new Map<string, number>()                          // produto simples
    const sizeStockMap    = new Map<string, Record<string, number>>()          // somente tamanho
    const flavorStockMap  = new Map<string, Record<string, number>>()          // somente sabor
    // variação (tamanho+sabor): chave = "productId|size|flavor"
    const variationStockMap = new Map<string, number>()

    const bundleIds   = new Map<string, number>()
    const priceMap    = new Map<string, number>()

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity < 1) {
        return NextResponse.json({ error: 'Item inválido no carrinho' }, { status: 400 })
      }

      const { data: product } = await supabase
        .from('products')
        .select('id, stock, size_stock, flavor_stock, sizes, flavors, name, price, active')
        .eq('id', item.product_id)
        .single()

      if (product) {
        if (!product.active) {
          return NextResponse.json({ error: `Produto "${product.name}" não está disponível` }, { status: 400 })
        }

        const hasSizes   = Array.isArray(product.sizes)   && product.sizes.length   > 0
        const hasFlavors = Array.isArray(product.flavors) && product.flavors.length > 0
        const isCombo    = hasSizes && hasFlavors
        const isSizeOnly = hasSizes && !hasFlavors
        const isFlavorOnly = hasFlavors && !hasSizes

        if (isCombo) {
          // Produto com tamanho E sabor — valida na tabela product_variations
          if (!item.size || !item.flavor) {
            return NextResponse.json({
              error: `"${product.name}" requer seleção de tamanho e sabor`
            }, { status: 400 })
          }
          const { data: variation } = await supabase
            .from('product_variations')
            .select('stock')
            .eq('product_id', item.product_id)
            .eq('size', item.size)
            .eq('flavor', item.flavor)
            .single()

          const available = variation?.stock ?? 0
          if (available < item.quantity) {
            return NextResponse.json({
              error: `Estoque insuficiente para "${product.name}" — ${item.flavor} / ${item.size}. Disponível: ${available}`
            }, { status: 400 })
          }
          const varKey = `${item.product_id}|${item.size}|${item.flavor}`
          variationStockMap.set(varKey, available)

        } else if (isSizeOnly) {
          // Produto com tamanho apenas
          const hasSizeStock = product.size_stock && Object.keys(product.size_stock).length > 0
          if (hasSizeStock && item.size) {
            const available = (product.size_stock as Record<string, number>)[item.size] ?? 0
            if (available < item.quantity) {
              return NextResponse.json({
                error: `Estoque insuficiente para "${product.name}" tamanho ${item.size}. Disponível: ${available}`
              }, { status: 400 })
            }
            sizeStockMap.set(item.product_id, product.size_stock as Record<string, number>)
          } else {
            if (product.stock < item.quantity) {
              return NextResponse.json({
                error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`
              }, { status: 400 })
            }
            stockMap.set(item.product_id, product.stock)
          }

        } else if (isFlavorOnly) {
          // Produto com sabor apenas
          const hasFlavorStock = product.flavor_stock && Object.keys(product.flavor_stock).length > 0
          if (hasFlavorStock && item.flavor) {
            const available = (product.flavor_stock as Record<string, number>)[item.flavor] ?? 0
            if (available < item.quantity) {
              return NextResponse.json({
                error: `Estoque insuficiente para "${product.name}" sabor ${item.flavor}. Disponível: ${available}`
              }, { status: 400 })
            }
            flavorStockMap.set(item.product_id, product.flavor_stock as Record<string, number>)
          } else {
            if (product.stock < item.quantity) {
              return NextResponse.json({
                error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`
              }, { status: 400 })
            }
            stockMap.set(item.product_id, product.stock)
          }

        } else {
          // Produto simples
          if (product.stock < item.quantity) {
            return NextResponse.json({
              error: `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}`
            }, { status: 400 })
          }
          stockMap.set(item.product_id, product.stock)
        }

        priceMap.set(item.product_id, product.price)

      } else {
        // Bundle / Kit
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

    // Recalcular subtotal com preços do banco
    let serverSubtotal = 0
    const serverItems = items.map((item: {
      product_id: string; quantity: number;
      product_name?: string; product_image?: string;
      size?: string; flavor?: string
    }) => {
      const actualPrice = priceMap.get(item.product_id) ?? 0
      serverSubtotal += actualPrice * item.quantity
      return { ...item, unit_price: actualPrice, total_price: Math.round(actualPrice * item.quantity * 100) / 100 }
    })
    serverSubtotal = Math.round(serverSubtotal * 100) / 100

    // Validar cupom
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

    // Validar pontos de fidelidade
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

    // Calcular frete
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

    const serverTotal = Math.max(0, Math.round(
      (serverSubtotal - serverDiscount - serverPointsDiscount + serverShipping) * 100
    ) / 100)

    // Criar pedido
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

    // ── Decrementar estoques ──────────────────────────────────────────────────

    // 1. Variações combo (tamanho + sabor) — agrupado por produto + variação
    type VarDecrements = Record<string, number> // "size|flavor" → qty
    const variationDecrementsMap = new Map<string, VarDecrements>()

    // 2. Sabores (sabor apenas) — agrupado por produto
    type FlavorDecrements = Record<string, number> // flavor → qty
    const flavorDecrementsMap = new Map<string, FlavorDecrements>()

    // 3. Tamanhos (tamanho apenas) — agrupado por produto
    type SizeDecrements = Record<string, number> // size → qty
    const sizeDecrementsMap = new Map<string, SizeDecrements>()

    for (const item of items) {
      const varKey = item.size && item.flavor ? `${item.product_id}|${item.size}|${item.flavor}` : null

      if (varKey && variationStockMap.has(varKey)) {
        // Combo
        const existing = variationDecrementsMap.get(item.product_id) || {}
        const ik = `${item.size}|${item.flavor}`
        variationDecrementsMap.set(item.product_id, {
          ...existing,
          [ik]: (existing[ik] || 0) + item.quantity,
        })
      } else if (flavorStockMap.has(item.product_id) && item.flavor) {
        // Sabor apenas
        const existing = flavorDecrementsMap.get(item.product_id) || {}
        flavorDecrementsMap.set(item.product_id, {
          ...existing,
          [item.flavor]: (existing[item.flavor] || 0) + item.quantity,
        })
      } else if (sizeStockMap.has(item.product_id) && item.size) {
        // Tamanho apenas
        const existing = sizeDecrementsMap.get(item.product_id) || {}
        sizeDecrementsMap.set(item.product_id, {
          ...existing,
          [item.size]: (existing[item.size] || 0) + item.quantity,
        })
      }
    }

    // Bundles e produtos simples
    for (const item of items) {
      const varKey = item.size && item.flavor ? `${item.product_id}|${item.size}|${item.flavor}` : null
      const isVariation = varKey && variationStockMap.has(varKey)
      const isFlavor    = flavorStockMap.has(item.product_id) && item.flavor
      const isSize      = sizeStockMap.has(item.product_id)   && item.size

      if (bundleIds.has(item.product_id)) {
        const currentStock = bundleIds.get(item.product_id) ?? 0
        await supabase
          .from('bundles')
          .update({ stock: Math.max(0, currentStock - item.quantity) })
          .eq('id', item.product_id)
      } else if (!isVariation && !isFlavor && !isSize) {
        // Produto simples
        const currentStock = stockMap.get(item.product_id) ?? 0
        await supabase
          .from('products')
          .update({ stock: Math.max(0, currentStock - item.quantity) })
          .eq('id', item.product_id)
      }
    }

    // Tamanho apenas (um UPDATE por produto)
    for (const [productId, decrements] of sizeDecrementsMap) {
      const currentSizeStock = { ...(sizeStockMap.get(productId) ?? {}) }
      let newTotal = 0
      for (const [size, qty] of Object.entries(decrements)) {
        currentSizeStock[size] = Math.max(0, (currentSizeStock[size] ?? 0) - qty)
      }
      for (const qty of Object.values(currentSizeStock)) newTotal += qty
      await supabase
        .from('products')
        .update({ size_stock: currentSizeStock, stock: newTotal })
        .eq('id', productId)
    }

    // Sabor apenas (um UPDATE por produto)
    for (const [productId, decrements] of flavorDecrementsMap) {
      const currentFlavorStock = { ...(flavorStockMap.get(productId) ?? {}) }
      let newTotal = 0
      for (const [flavor, qty] of Object.entries(decrements)) {
        currentFlavorStock[flavor] = Math.max(0, (currentFlavorStock[flavor] ?? 0) - qty)
      }
      for (const qty of Object.values(currentFlavorStock)) newTotal += qty
      await supabase
        .from('products')
        .update({ flavor_stock: currentFlavorStock, stock: newTotal })
        .eq('id', productId)
    }

    // Combo — atualiza cada variação individualmente e recalcula stock global
    const updatedProductIds = new Set<string>()
    for (const [productId, decrements] of variationDecrementsMap) {
      for (const [ik, qty] of Object.entries(decrements)) {
        const [size, flavor] = ik.split('|')
        const varKey = `${productId}|${size}|${flavor}`
        const currentStock = variationStockMap.get(varKey) ?? 0
        await supabase
          .from('product_variations')
          .update({ stock: Math.max(0, currentStock - qty) })
          .eq('product_id', productId)
          .eq('size', size)
          .eq('flavor', flavor)
      }
      updatedProductIds.add(productId)
    }
    // Recalcula stock global do produto (soma de todas as variações)
    for (const productId of updatedProductIds) {
      const { data: allVariations } = await supabase
        .from('product_variations')
        .select('stock')
        .eq('product_id', productId)
      const totalStock = (allVariations ?? []).reduce((s: number, v: { stock: number }) => s + v.stock, 0)
      await supabase.from('products').update({ stock: totalStock }).eq('id', productId)
    }

    // ─────────────────────────────────────────────────────────────────────────

    // Pedido de retirada: aprovar imediatamente
    if (payment_method === 'pickup') {
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

    // Pedido gratuito (cupom 100%)
    if (Number(serverTotal) <= 0) {
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

      const { data: pedidoAprovado } = await supabase.from('orders').select('*').eq('id', order.id).single()
      if (pedidoAprovado) {
        const emailFn = payment_method === 'pickup'
          ? enviarEmailProntoParaRetirada
          : enviarEmailConfirmacaoPedido
        emailFn(pedidoAprovado as import('@/types').Order).catch(() => {})
      }

      return NextResponse.json({ order_id: order.id, order_number: order.order_number })
    }

    // Pagamento online via Mercado Pago
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      const isSandbox = (process.env.MERCADOPAGO_ACCESS_TOKEN || '').startsWith('TEST-')
      const preferenceClient = getPreferenceClient()

      const preference = await preferenceClient.create({
        body: {
          items: [{
            id: 'pedido',
            title: `Pedido Space Fit #${order.order_number}`,
            quantity: 1,
            currency_id: 'BRL',
            unit_price: serverTotal,
          }],
          payer: {
            name: customer_name,
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
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
