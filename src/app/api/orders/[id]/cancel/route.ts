import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Verificar autenticação
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('id, user_id, payment_status, items, coupon_code')
    .eq('id', id)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }
  if (order.user_id !== user.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }
  if (order.payment_status !== 'pending') {
    return NextResponse.json({ error: 'Apenas pedidos pendentes podem ser cancelados' }, { status: 400 })
  }

  // Cancelar
  await supabase
    .from('orders')
    .update({ payment_status: 'rejected', order_status: 'cancelled' })
    .eq('id', id)

  // Restaurar estoque de cada item
  const items = (order.items || []) as Array<{
    product_id: string; quantity: number; size?: string; flavor?: string
  }>

  for (const item of items) {
    // Tenta produto primeiro
    const { data: product } = await supabase
      .from('products')
      .select('id, stock, size_stock, flavor_stock, sizes, flavors')
      .eq('id', item.product_id)
      .maybeSingle()

    if (product) {
      const hasSizes   = Array.isArray(product.sizes)   && product.sizes.length   > 0
      const hasFlavors = Array.isArray(product.flavors) && product.flavors.length > 0
      const isCombo    = hasSizes && hasFlavors

      if (isCombo && item.size && item.flavor) {
        // Variação combo
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

    } else {
      // Bundle
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
      }
    }
  }

  return NextResponse.json({ ok: true })
}
