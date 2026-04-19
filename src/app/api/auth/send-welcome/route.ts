import { NextRequest, NextResponse } from 'next/server'
import { enviarEmailBoasVindas } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { nome, email } = await req.json() as { nome?: string; email?: string }
    if (!nome || !email) {
      return NextResponse.json({ error: 'nome e email são obrigatórios' }, { status: 400 })
    }
    // Fire-and-forget — não bloqueia o cadastro se o email falhar
    enviarEmailBoasVindas(nome, email).catch(e =>
      console.error('[send-welcome] Erro:', e)
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
