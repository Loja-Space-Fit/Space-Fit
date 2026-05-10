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

    const userId = data.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 })
    }

    // Criar perfil diretamente (garante que o perfil existe mesmo se o trigger falhar)
    const { error: profileError } = await supabase.from('profiles').upsert({
      id:        userId,
      email,
      full_name: formattedName,
      phone:     phone ?? '',
    }, { onConflict: 'id' })
    if (profileError) {
      console.error('[signup] Erro ao criar perfil:', profileError.message)
    }

    // Usar hashed_token para montar URL própria — assim apenas nossa rota /auth/confirm
    // faz a verificação (evita que o token seja consumido 2x pelo endpoint do Supabase)
    const hashed_token    = data.properties?.hashed_token
    const verificationType = data.properties?.verification_type ?? 'signup'
    if (!hashed_token) {
      return NextResponse.json({ error: 'Não foi possível gerar o link de confirmação.' }, { status: 500 })
    }

    const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token_hash=${encodeURIComponent(hashed_token)}&type=${encodeURIComponent(verificationType)}&next=/minha-conta`

    // Enviar email com botão de confirmação via Resend (aguardado para capturar erros nos logs)
    try {
      await enviarEmailConfirmacaoConta(formattedName, email, confirmUrl)
      console.log('[signup] Email de confirmação enviado para:', email)
    } catch (emailErr) {
      console.error('[signup] Falha ao enviar email de confirmação:', emailErr)
      console.error('[signup] confirmUrl gerado:', confirmUrl)
      // Não bloqueia — conta foi criada, usuário pode pedir reenvio
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[signup]', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
