'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router     = useRouter()
  const [tokenHash, setTokenHash] = useState('')
  const [expired,  setExpired]  = useState(false)
  const [ready,    setReady]    = useState(false)
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // Link expirado (sinalizado pelo auth/confirm)
    if (params.get('expired') === 'true') {
      setExpired(true)
      return
    }

    // Token passado pelo auth/confirm — não cria sessão ainda
    const hash = params.get('token_hash')
    if (hash) {
      setTokenHash(hash)
      setReady(true)
      return
    }

    // Fallback: link processado diretamente pelo Supabase (fluxo PKCE/legado)
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('A senha deve ter pelo menos uma letra maiúscula.')
      return
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('A senha deve ter pelo menos um caractere especial (!@#$...).')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()

    // Se chegou via token_hash (fluxo normal), precisa criar a sessão de recovery primeiro
    if (tokenHash) {
      const { error: otpError } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token_hash: tokenHash,
      })
      if (otpError) {
        setLoading(false)
        setExpired(true)
        return
      }
    }

    const { error } = await supabase.auth.updateUser({ password })
    // Faz logout imediatamente para não deixar o usuário autenticado após o reset
    await supabase.auth.signOut()
    setLoading(false)
    if (error) {
      setError('Erro ao atualizar senha. O link pode ter expirado.')
    } else {
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0a]">
        <div className="w-full max-w-md text-center">
          <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-32 w-auto mx-auto mb-6" />
          <CheckCircle2 className="w-14 h-14 text-[#b2ea0f] mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Senha atualizada!</h2>
          <p className="text-[#9ca3af]">Redirecionando para o login...</p>
        </div>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0a]">
        <div className="w-full max-w-md text-center">
          <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-32 w-auto mx-auto mb-6" />
          <div className="w-16 h-16 rounded-full bg-red-500/15 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Link expirado</h2>
          <p className="text-[#9ca3af] mb-6">
            Este link de redefinição já foi utilizado ou expirou. Solicite um novo link para continuar.
          </p>
          <button
            onClick={() => router.push('/login?forgot=true')}
            className="btn-green w-full"
          >
            Solicitar novo link
          </button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0a]">
        <div className="w-full max-w-md text-center">
          <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-32 w-auto mx-auto mb-6" />
          <Loader2 className="w-8 h-8 animate-spin text-[#b2ea0f] mx-auto mb-4" />
          <p className="text-[#9ca3af]">Verificando link de redefinição...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0a]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-32 w-auto mx-auto" />
          <h1 className="text-2xl font-black text-white">Nova senha</h1>
          <p className="text-[#9ca3af] text-sm mt-1">Escolha uma senha segura para sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">{error}</div>
          )}

          <div>
            <label className="text-sm text-[#9ca3af] mb-1.5 block">Nova senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-10 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b2ea0f] hover:text-[#c8f040] transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <ul className="mt-2 space-y-1">
                {[
                  { label: 'Mínimo 8 caracteres',                         ok: password.length >= 8 },
                  { label: 'Pelo menos uma letra maiúscula',              ok: /[A-Z]/.test(password) },
                  { label: 'Pelo menos um caractere especial (!@#$...)',  ok: /[^A-Za-z0-9]/.test(password) },
                ].map(r => (
                  <li key={r.label} className={`text-xs flex items-center gap-1.5 ${r.ok ? 'text-[#b2ea0f]' : 'text-[#9ca3af]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.ok ? 'bg-[#b2ea0f]' : 'bg-[#9ca3af]'}`} />
                    {r.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="text-sm text-[#9ca3af] mb-1.5 block">Confirmar senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-green py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
