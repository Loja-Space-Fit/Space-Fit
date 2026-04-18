import { NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

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

  // Apagar dependências primeiro para evitar erros de foreign key
  await supabase.from('loyalty_transactions').delete().eq('order_id', id)
  await supabase.from('order_items').delete().eq('order_id', id)

  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
