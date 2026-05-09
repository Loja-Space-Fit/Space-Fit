import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (!error) user = data.user
  } catch {
    // Refresh token inválido/expirado — tratar como não autenticado
  }
  const path = request.nextUrl.pathname

  // Helper: cria redirect preservando os cookies de sessão renovados
  function redirectWithCookies(destination: string, preserveRedirect = false) {
    const url = request.nextUrl.clone()
    url.pathname = destination
    url.search = ''
    if (preserveRedirect) {
      url.searchParams.set('redirect', request.nextUrl.pathname)
    }
    const res = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => {
      res.cookies.set(cookie.name, cookie.value)
    })
    return res
  }

  // === Proteção /admin — exige autenticação + is_admin verificado no servidor ===
  if (path.startsWith('/admin')) {
    if (!user) return redirectWithCookies('/login', true)

    // Verifica is_admin com service role (bypassa RLS, não depende do cliente)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey) {
      const serviceClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        { cookies: { getAll: () => [], setAll: () => {} } }
      )
      const { data: perfil } = await serviceClient
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!perfil?.is_admin) return redirectWithCookies('/')
    }
  }

  // === Proteção /minha-conta — exige autenticação ===
  if (path.startsWith('/minha-conta') && !user) {
    return redirectWithCookies('/login', true)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/minha-conta/:path*', '/minha-conta'],
}
