// Rota de API para disparo de email de atualizacao de status.
// Chamada pelo client component da pagina de pedidos apos mudar status para
// "shipped" ou "delivered". Mantemos o envio no servidor para proteger a API key.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { enviarEmailStatusAtualizado } from '@/lib/email'
import type { Order } from '@/types'

export async function POST(req: NextRequest) {
  try {
    // Valida que o chamador e um admin autenticado
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: perfil } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!perfil?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { pedidoId, novoStatus } = await req.json() as { pedidoId: string; novoStatus: string }

    if (!pedidoId || !novoStatus) {
      return NextResponse.json({ error: 'pedidoId e novoStatus sao obrigatorios' }, { status: 400 })
    }

    // Busca o pedido completo para compor o email
    const { data: pedido } = await supabase
      .from('orders')
      .select('*')
      .eq('id', pedidoId)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 })
    }

    await enviarEmailStatusAtualizado(pedido as Order, novoStatus)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/admin/email-status] Erro:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
