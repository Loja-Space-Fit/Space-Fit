import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

// Retorna a conta de fidelidade + transações do usuário logado via user_id
export async function GET() {
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const supabase = createServiceClient()

    // Busca conta pelo user_id — direto, sem depender de telefone
    const { data: account } = await supabase
      .from('loyalty_accounts')
      .select('id, points, total_spent')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!account) {
      return NextResponse.json({ account: null, transactions: [] })
    }

    // Buscar order_ids do usuário para puxar as transações (schema real usa order_id, não account_id)
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('payment_status', 'approved')

    const orderIds = (orders ?? []).map((o: { id: string }) => o.id)

    const { data: transactions } = orderIds.length > 0
      ? await supabase
          .from('loyalty_transactions')
          .select('points_earned, points_redeemed, description, created_at')
          .in('order_id', orderIds)
          .order('created_at', { ascending: false })
          .limit(20)
      : { data: [] }

    return NextResponse.json({ account, transactions: transactions ?? [] })
  } catch (err) {
    console.error('[loyalty/me]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
