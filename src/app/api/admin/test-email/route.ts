import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient, createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  // Requer autenticação de admin
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const to = req.nextUrl.searchParams.get('to')
  if (!to) return NextResponse.json({ error: 'Informe ?to=email@exemplo.com' }, { status: 400 })

  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM_EMAIL

  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY não configurado no Vercel' }, { status: 500 })
  if (!from)   return NextResponse.json({ error: 'RESEND_FROM_EMAIL não configurado no Vercel' }, { status: 500 })

  try {
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from,
      to,
      subject: 'Teste de email | Space Fit',
      html: '<p>Se você recebeu este email, o Resend está configurado corretamente! 🎉</p>',
    })

    return NextResponse.json({ ok: true, from, to, result })
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
