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

    const { data: transactions } = await supabase
      .from('loyalty_transactions')
      .select('points, type, description, created_at')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ account, transactions: transactions ?? [] })
  } catch (err) {
    console.error('[loyalty/me]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
