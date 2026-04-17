import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Verificar autenticação e perfil admin
  const clienteUsuario = await createClient()
  const { data: { user } } = await clienteUsuario.auth.getUser()

  if (!user) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const serviceClient = createServiceClient()
  const { data: perfil } = await serviceClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.is_admin) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const de  = searchParams.get('de')   // YYYY-MM-DD
  const ate = searchParams.get('ate')  // YYYY-MM-DD

  let desde: string
  let ateISO: string | undefined

  if (de && ate) {
    desde  = new Date(de  + 'T00:00:00').toISOString()
    ateISO = new Date(ate + 'T23:59:59').toISOString()
  } else {
    const dias = Math.min(365, Math.max(1, parseInt(searchParams.get('dias') || '30')))
    desde = new Date(Date.now() - dias * 86_400_000).toISOString()
  }

  const query = serviceClient
    .from('orders')
    .select('total, created_at')
    .gte('created_at', desde)
    .in('order_status', ['paid', 'preparing', 'shipped', 'delivered'])
    .order('created_at', { ascending: true })

  if (ateISO) query.lte('created_at', ateISO)

  const { data: pedidos, error } = await query

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  // Preencher todos os dias no intervalo (incluindo dias sem vendas)
  const porDia = new Map<string, { receita: number; pedidos: number }>()

  if (de && ate) {
    const cur = new Date(de + 'T00:00:00')
    const fim = new Date(ate + 'T00:00:00')
    while (cur <= fim) {
      const chave = `${String(cur.getDate()).padStart(2, '0')}/${String(cur.getMonth() + 1).padStart(2, '0')}`
      porDia.set(chave, { receita: 0, pedidos: 0 })
      cur.setDate(cur.getDate() + 1)
    }
  } else {
    const dias = Math.min(365, Math.max(1, parseInt(searchParams.get('dias') || '30')))
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      const chave = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      porDia.set(chave, { receita: 0, pedidos: 0 })
    }
  }

  for (const p of pedidos ?? []) {
    const d = new Date(p.created_at)
    const chave = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    const atual = porDia.get(chave)
    if (atual) { atual.receita += Number(p.total); atual.pedidos += 1 }
  }

  const resultado = Array.from(porDia.entries()).map(([data, val]) => ({
    data,
    receita: Number(val.receita.toFixed(2)),
    pedidos: val.pedidos,
  }))

  return NextResponse.json(resultado, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
