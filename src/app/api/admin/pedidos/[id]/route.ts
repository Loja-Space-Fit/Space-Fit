import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'
import { processLoyaltyPoints } from '@/lib/loyalty'
import { enviarEmailStatusAtualizado, enviarEmailConfirmacaoPedido, enviarEmailProntoParaRetirada } from '@/lib/email'
import type { Order } from '@/types'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Verificar admin
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!perfil?.is_admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  // Soft delete — oculta do admin mas mantém visível para o usuário
  const { error } = await supabase
    .from('orders')
    .update({ hidden_from_admin: true })
    .eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const supabase = createServiceClient()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!perfil?.is_admin) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  const body = await req.json() as { order_status: string }
  const { order_status } = body

  const updates: Record<string, unknown> = { order_status }
  if (order_status === 'paid') {
    updates.payment_status = 'approved'
  }

  const { error } = await supabase.from('orders').update(updates).eq('id', id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  if (order_status === 'paid') {
    try {
      await processLoyaltyPoints(id, supabase)
    } catch (e) {
      console.error('[admin] Erro ao processar pontos:', e)
    }

    // Enviar email de confirmação ao marcar como pago
    const { data: pedido } = await supabase.from('orders').select('*').eq('id', id).single()
    if (pedido) {
      const emailFn = pedido.payment_method === 'pickup'
        ? enviarEmailProntoParaRetirada
        : enviarEmailConfirmacaoPedido
      emailFn(pedido as Order).catch(() => {})
    }
  }

  if (order_status === 'shipped' || order_status === 'delivered') {
    const { data: pedido } = await supabase.from('orders').select('*').eq('id', id).single()
    if (pedido) {
      enviarEmailStatusAtualizado(pedido as Order, order_status).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}
