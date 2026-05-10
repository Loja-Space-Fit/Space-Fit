import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmailConfirmacaoConta } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email, password, nome, phone } = await req.json() as {
      email?: string
      password?: string
      nome?: string
      phone?: string
    }

    if (!email || !password || !nome) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const formattedName = nome.trim().replace(/\b\w/g, c => c.toUpperCase())

    const supabase = createServiceClient()

    // generateLink cria o usuário E retorna o link de confirmação sem enviar email
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        data: { full_name: formattedName, phone: phone ?? '' },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/minha-conta`,
      },
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered')) {
        return NextResponse.json({ error: 'already_registered' }, { status: 409 })
      }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const confirmUrl = data.properties?.action_link
    if (!confirmUrl) {
      return NextResponse.json({ error: 'Não foi possível gerar o link de confirmação.' }, { status: 500 })
    }

    // Enviar email com botão de confirmação via Resend
    enviarEmailConfirmacaoConta(formattedName, email, confirmUrl).catch(e =>
      console.error('[signup] Erro ao enviar email de confirmacao:', e)
    )

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[signup]', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
