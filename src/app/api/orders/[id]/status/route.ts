import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .select('payment_status, order_status, user_id')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  // Se o pedido pertence a um usuário autenticado, verificar ownership
  if (data.user_id) {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user || user.id !== data.user_id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
    }
  }

  return NextResponse.json({
    payment_status: data.payment_status,
    order_status: data.order_status,
  })
}
