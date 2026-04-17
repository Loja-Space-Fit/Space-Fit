import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function POST() {
  // Só admin autenticado pode rodar a limpeza
  const clienteUsuario = await createClient()
  const { data: { user: usuarioLogado } } = await clienteUsuario.auth.getUser()

  if (!usuarioLogado) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Verificar flag is_admin na tabela profiles
  const { data: perfil } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', usuarioLogado.id)
    .single()

  if (!perfil?.is_admin) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  // Delega toda a lógica de limpeza para a função RPC no banco,
  // assim mantemos as regras centralizadas em um só lugar (SQL)
  const { data: resumo, error: erroBanco } = await supabase.rpc('run_cleanup')

  if (erroBanco) {
    console.error('[limpeza] Erro ao executar RPC:', erroBanco.message)
    return NextResponse.json({ erro: 'Falha ao executar limpeza no banco' }, { status: 500 })
  }

  // A RPC retorna em inglês (snake_case) — traduzimos aqui para o front não depender disso
  return NextResponse.json({
    pedidos_excluidos:    resumo.deleted_orders       ?? 0,
    cupons_desativados:   resumo.deactivated_coupons  ?? 0,
    avaliacoes_excluidas: resumo.deleted_reviews      ?? 0,
    executado_em:         resumo.executed_at          ?? null,
  })
}
