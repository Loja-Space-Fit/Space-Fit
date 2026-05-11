'use client'

import { Suspense, useState, useCallback } from 'react'
import Image from 'next/image'
import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Mail, Phone, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Constantes e utilitários fora do componente — não recriados a cada render
// ---------------------------------------------------------------------------

const supabase = createClient()

const ERROR_MESSAGES: Record<string, string> = {
  not_found:      'E-mail ou número de celular não cadastrados.',
  wrong_password: 'Senha ou usuário inválido.',
  not_confirmed:  'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
  network_error:  'Erro de conexão. Verifique sua internet.',
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2)  return digits
  if (digits.length <= 6)  return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

// Wrapper compartilhado entre as três views
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0a]">
      {children}
    </div>
  )
}

// Alerta reutilizável (erro vermelho ou info verde)
function Alert({ variant, children }: { variant: 'error' | 'info'; children: React.ReactNode }) {
  const styles = variant === 'error'
    ? 'bg-red-500/10 border-red-500/30 text-red-400'
    : 'bg-[#b2ea0f]/10 border-[#b2ea0f]/30 text-[#b2ea0f]'
  return (
    <div className={`border rounded-lg px-4 py-3 text-sm ${styles}`}>{children}</div>
  )
}

function LoginForm() {
  const { signIn }   = useAuth()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const redirectTo    = searchParams.get('redirect') || '/'
  const loginRequired = searchParams.get('message') === 'login-required'

  const [mode, setMode]               = useState<'email' | 'phone'>('email')
  const [view, setView]               = useState<'login' | 'forgot' | 'forgot-sent'>(
    searchParams.get('forgot') === 'true' ? 'forgot' : 'login'
  )
  const [identifier, setIdentifier]   = useState('')
  const [password, setPassword]       = useState('')
  const [show, setShow]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [forgotEmail, setForgotEmail] = useState('')

  const toggleMode = useCallback(() => {
    setMode(m => m === 'email' ? 'phone' : 'email')
    setIdentifier('')
    setError('')
  }, [])

  const toggleShow = useCallback(() => setShow(v => !v), [])

  const goToLogin = useCallback(() => {
    setView('login')
    setError('')
  }, [])

  const goToForgot = useCallback(() => {
    setView('forgot')
    setForgotEmail(prev => identifier.includes('@') ? identifier : prev)
    setError('')
  }, [identifier])

  const handleIdentifierChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(mode === 'phone' ? formatPhone(e.target.value) : e.target.value)
  }, [mode])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const raw = mode === 'phone' ? identifier.replace(/\D/g, '') : identifier.trim()
    const { error } = await signIn(raw, password)
    if (error) {
      setError(ERROR_MESSAGES[error] ?? 'Erro ao entrar. Tente novamente.')
      setLoading(false)
    } else {
      router.push(redirectTo)
    }
  }, [mode, identifier, password, signIn, redirectTo, router])

  const handleForgot = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      })
    } catch {
      // ignora — sempre mostra sucesso por segurança
    }
    setLoading(false)
    setView('forgot-sent')
  }, [forgotEmail])

  if (view === 'forgot-sent') {
    return (
      <PageShell>
        <div className="w-full max-w-md text-center">
          <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-32 w-auto mx-auto mb-6" />
          <CheckCircle2 className="w-14 h-14 text-[#b2ea0f] mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">E-mail enviado!</h2>
          <p className="text-[#9ca3af] mb-6">Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
          <button onClick={goToLogin} className="btn-outline text-sm flex items-center gap-2 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Voltar para o login
          </button>
        </div>
      </PageShell>
    )
  }

  if (view === 'forgot') {
    return (
      <PageShell>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-32 w-auto mx-auto" />
            <h1 className="text-2xl font-black text-white mt-2">Esqueceu a senha?</h1>
            <p className="text-[#9ca3af] text-sm mt-1">Digite seu e-mail e enviaremos um link para redefini-la</p>
          </div>
          <form onSubmit={handleForgot} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col gap-4">
            {error && <Alert variant="error">{error}</Alert>}
            <div>
              <label className="text-sm text-[#9ca3af] mb-1.5 block">E-mail cadastrado</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-green py-3 flex items-center justify-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>
          </form>
          <button onClick={goToLogin} className="mt-4 flex items-center gap-2 text-sm text-[#9ca3af] hover:text-white mx-auto">
            <ArrowLeft className="w-4 h-4" /> Voltar para o login
          </button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="w-full max-w-md">

        <div className="text-center mb-3">
          <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-40 w-auto mx-auto" />
          <h1 className="text-2xl font-black text-white -mt-6">Entrar na sua conta</h1>
          <p className="text-[#9ca3af] text-sm mt-1">Acompanhe seus pedidos e muito mais</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col gap-4">

          {loginRequired && <Alert variant="info">Faça login para finalizar sua compra.</Alert>}
          {error && <Alert variant="error">{error}</Alert>}

          <div>
            <label className="text-sm text-[#9ca3af] mb-1.5 block">
              {mode === 'email' ? 'E-mail' : 'Celular'}
            </label>
            <div className="relative">
              {mode === 'email'
                ? <Mail  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              }
              <input
                type="text"
                required
                inputMode={mode === 'phone' ? 'tel' : 'email'}
                value={identifier}
                onChange={handleIdentifierChange}
                placeholder={mode === 'email' ? 'E-mail' : '(11) 99999-9999'}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors"
              />
            </div>
            <button type="button" onClick={toggleMode} className="mt-1.5 text-xs text-[#b2ea0f] hover:underline">
              {mode === 'email' ? 'Entrar com celular' : 'Entrar com e-mail'}
            </button>
          </div>

          <div>
            <label className="text-sm text-[#9ca3af] mb-1.5 block">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input
                type={show ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-10 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors"
              />
              <button
                type="button"
                onClick={toggleShow}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b2ea0f] hover:text-[#c8f040] transition-colors"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-green py-3 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <button type="button" onClick={goToForgot} className="text-sm text-[#9ca3af] hover:text-[#b2ea0f] transition-colors text-center">
            Esqueceu sua senha?
          </button>
        </form>

        <p className="text-center text-sm text-[#9ca3af] mt-4">
          Não tem conta?{' '}
          <Link
            href={`/cadastro${redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
            className="text-[#b2ea0f] font-semibold hover:underline"
          >
            Cadastre-se
          </Link>
        </p>
        <div className="flex justify-center mt-4">
          <Link
            href="/"
            className="inline-flex items-center px-5 py-2 rounded-full bg-[#b2ea0f] text-black text-sm font-semibold hover:bg-[#c8f040] transition-colors duration-200"
          >
            Voltar à loja
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
