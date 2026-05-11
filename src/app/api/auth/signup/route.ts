import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarEmailBoasVindas } from '@/lib/email'

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

    // Cria usuário já confirmado — sem necessidade de verificar email
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: formattedName, phone: phone ?? '' },
    })

    if (error) {
      const msg = error.message ?? ''
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already been registered') || msg.toLowerCase().includes('already exists')) {
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

    // Enviar email de boas-vindas (sem link de confirmação)
    try {
      await enviarEmailBoasVindas(formattedName, email)
      console.log('[signup] Email de boas-vindas enviado para dominio:', email.split('@')[1])
    } catch (emailErr) {
      console.error('[signup] Falha ao enviar email de boas-vindas:', emailErr)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[signup]', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
