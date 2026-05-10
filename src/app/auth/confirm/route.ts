import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const code       = searchParams.get('code')
  const next       = searchParams.get('next') ?? '/minha-conta'

  const supabase = await createClient()

  // Fluxo PKCE: Supabase redireciona com ?code= após verificar o link do email
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Fluxo OTP/token_hash: link gerado via admin.generateLink ou signUp sem PKCE
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Em caso de erro, redirecionar para login com mensagem
  return NextResponse.redirect(new URL('/login?error=confirm', request.url))
}
