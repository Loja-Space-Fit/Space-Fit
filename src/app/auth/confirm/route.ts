import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Cria um cliente Supabase que escreve cookies diretamente na resposta fornecida
function makeSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const code       = searchParams.get('code')
  const next       = searchParams.get('next') ?? '/minha-conta'

  // Fluxo PKCE: ?code= (fallback caso Supabase redirecione pelo endpoint próprio)
  if (code) {
    const response = NextResponse.redirect(new URL(next, request.url))
    const supabase = makeSupabase(request, response)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return response
  }

  // Fluxo OTP/token_hash: link gerado com hashed_token de admin.generateLink
  if (token_hash && type) {
    const response = NextResponse.redirect(new URL(next, request.url))
    const supabase = makeSupabase(request, response)
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) return response
  }

  // Para recovery (redefinição de senha), redireciona para a página de reset com aviso de link expirado
  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password?expired=true', request.url))
  }

  // Para outros tipos, redirecionar para login com mensagem
  return NextResponse.redirect(new URL('/login?error=confirm', request.url))
}
