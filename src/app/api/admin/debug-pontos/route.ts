import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function GET() {
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: perfil } = await supabase.from('profiles').select('phone, full_name').eq('id', user.id).single()
  const phoneRaw = (perfil?.phone ?? '').replace(/\D/g, '')

  const { data: pedidos } = await supabase
    .from('orders')
    .select('id, order_number, customer_phone, payment_status, points_processed, points_earned, total')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: contas } = await supabase.from('loyalty_accounts').select('*')
  const { data: transacoes } = await supabase.from('loyalty_transactions').select('*').order('created_at', { ascending: false }).limit(20)

  return NextResponse.json({
    user_id: user.id,
    profile_phone_raw: perfil?.phone,
    profile_phone_normalized: phoneRaw,
    pedidos: pedidos?.map(p => ({
      ...p,
      customer_phone_normalized: (p.customer_phone ?? '').replace(/\D/g, ''),
    })),
    loyalty_accounts: contas,
    loyalty_transactions: transacoes,
  })
}
