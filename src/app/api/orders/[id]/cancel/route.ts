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

  // Buscar o pedido
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

  // Restaurar estoque dos itens (products e bundles)
  const items = (order.items || []) as Array<{ product_id: string; quantity: number }>
  for (const item of items) {
    const { data: product } = await supabase
      .from('products')
      .select('id, stock')
      .eq('id', item.product_id)
      .maybeSingle()

    if (product) {
      await supabase
        .from('products')
        .update({ stock: product.stock + item.quantity })
        .eq('id', item.product_id)
    } else {
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

  // Reverter uso do cupom (só se o pagamento havia sido aprovado antes)
  // Pedidos cancelados pelo cliente são sempre 'pending' — cupom nunca foi incrementado
  // (o increment só ocorre no webhook de aprovação), então nenhuma ação necessária aqui.

  return NextResponse.json({ ok: true })
}
