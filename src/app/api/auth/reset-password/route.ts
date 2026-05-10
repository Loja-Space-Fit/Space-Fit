import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmailRedefinirSenha } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string }

    if (!email) {
      return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // generateLink type 'recovery' gera o link SEM enviar email pelo Supabase
    const { data, error } = await supabase.auth.admin.generateLink({
      type:  'recovery',
      email: email.trim().toLowerCase(),
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
      },
    })

    // Sempre retorna sucesso — não revela se o e-mail está cadastrado
    if (error || !data?.properties?.hashed_token) {
      console.warn('[reset-password] email nao encontrado ou erro:', email, error?.message)
      return NextResponse.json({ ok: true })
    }

    const hashed_token = data.properties.hashed_token
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token_hash=${encodeURIComponent(hashed_token)}&type=recovery&next=/reset-password`

    // Buscar nome do perfil para personalizar o email
    const { data: perfil } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    const nome = perfil?.full_name ?? ''

    try {
      await enviarEmailRedefinirSenha(nome, email, resetUrl)
    } catch (emailErr) {
      console.error('[reset-password] Falha ao enviar email:', emailErr)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[reset-password]', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
