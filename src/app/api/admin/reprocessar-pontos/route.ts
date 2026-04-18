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

  // Buscar todos os pedidos pagos — independente da flag points_processed
  // O processLoyaltyPoints já verifica internamente se os pontos existem
  const { data: pedidos, error } = await supabase
    .from('orders')
    .select('id')
    .eq('payment_status', 'approved')

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  let processados = 0
  let erros = 0

  for (const pedido of pedidos ?? []) {
    try {
      await processLoyaltyPoints(pedido.id, supabase)
      processados++
    } catch {
      erros++
    }
  }

  return NextResponse.json({ processados, erros, total: pedidos?.length ?? 0 })
}
