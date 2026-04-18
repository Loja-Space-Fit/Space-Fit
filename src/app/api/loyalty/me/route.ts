import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

// Retorna a conta de fidelidade + transações do usuário logado
// Usa service role para contornar RLS — seguro pois sempre filtra pelo user_id da sessão
export async function GET() {
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const supabase = createServiceClient()

    // Buscar perfil para pegar o telefone
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single()

    const phone = (profile?.phone ?? '').replace(/\D/g, '')

    if (!phone) {
      return NextResponse.json({ account: null, transactions: [] })
    }

    // Buscar conta de fidelidade pelo telefone (service role ignora RLS)
    const { data: account } = await supabase
      .from('loyalty_accounts')
      .select('id, points, total_spent')
      .eq('customer_phone', phone)
      .maybeSingle()

    if (!account) {
      return NextResponse.json({ account: null, transactions: [] })
    }

    // Buscar transações
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
