import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { processLoyaltyPoints } from '@/lib/loyalty'

export async function POST() {
  // Verificar autenticação admin
  const clienteUsuario = await createClient()
  const { data: { user: usuarioLogado } } = await clienteUsuario.auth.getUser()
  if (!usuarioLogado) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', usuarioLogado.id)
    .single()
  if (!perfil?.is_admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  // 1. Limpar todos os dados antigos de fidelidade (reset completo)
  await supabase.from('loyalty_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('loyalty_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // 2. Resetar flag points_processed em todos os pedidos aprovados
  await supabase
    .from('orders')
    .update({ points_processed: false })
    .eq('payment_status', 'approved')

  // 3. Buscar todos os pedidos aprovados com user_id
  const { data: pedidos, error } = await supabase
    .from('orders')
    .select('id')
    .eq('payment_status', 'approved')
    .not('user_id', 'is', null)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  let processados = 0
  const errosDetalhados: string[] = []

  for (const pedido of pedidos ?? []) {
    try {
      await processLoyaltyPoints(pedido.id, supabase)
      processados++
    } catch (e) {
      errosDetalhados.push(`${pedido.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({
    processados,
    erros: errosDetalhados.length,
    errosDetalhados,
    total: pedidos?.length ?? 0,
  })
}
