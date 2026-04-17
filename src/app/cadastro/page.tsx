'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import { Lock, Mail, User, Phone, Eye, EyeOff, Loader2, Check, X as XIcon } from 'lucide-react'

function formatPhone(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2)  return digits
  if (digits.length <= 7)  return `(${digits.slice(0,2)}) ${digits.slice(2)}`
  if (digits.length <= 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  return v
}

function avaliarSenha(senha: string) {
  const criterios = [
    { label: 'Mínimo 8 caracteres',          ok: senha.length >= 8 },
    { label: 'Pelo menos uma letra maiúscula', ok: /[A-Z]/.test(senha) },
    { label: 'Pelo menos um caractere especial (!@#$...)', ok: /[^A-Za-z0-9]/.test(senha) },
  ]
  const pontos = criterios.filter(c => c.ok).length
  return { criterios, pontos }
}

export default function CadastroPage() {
  const { signUp } = useAuth()

  const [name, setName]         = useState('')
  const [phone, setPhone]       = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const { pontos } = avaliarSenha(password)
    if (pontos < 3) { setError('A senha não atende aos requisitos mínimos de segurança.'); return }
    if (password !== confirm)  { setError('As senhas não coincidem.'); return }

    setLoading(true)
    const { error } = await signUp(email, password, name, phone.replace(/\D/g, ''))
    if (error) {
      if (error.includes('already registered')) setError('Este e-mail já está cadastrado.')
      else setError(error)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  const forcaSenha = useMemo(() => avaliarSenha(password), [password])

  const forcaLabel = ['', 'Fraca', 'Média', 'Forte'][forcaSenha.pontos] ?? ''
  const forcaCor   = ['', '#f87171', '#facc15', '#b2ea0f'][forcaSenha.pontos] ?? ''

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0a]">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#b2ea0f]/15 border-2 border-[#b2ea0f] flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-[#b2ea0f]" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Verifique seu e-mail!</h2>
          <p className="text-[#9ca3af] mb-2">Enviamos um link de confirmação para:</p>
          <p className="text-white font-semibold mb-4">{email}</p>
          <p className="text-[#9ca3af] text-sm mb-6">Clique no link do e-mail para ativar sua conta e depois faça login.</p>
          <Link href="/login" className="btn-green px-6 py-3 inline-block rounded-xl">
            Ir para o Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a0a]">
      <div className="w-full max-w-md">

        <div className="text-center mb-3">
          <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-40 w-auto mx-auto" />
          <h1 className="text-2xl font-black text-white -mt-6">Criar conta</h1>
          <p className="text-[#9ca3af] text-sm mt-1">Cadastre-se e acompanhe seus pedidos</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm text-[#9ca3af] mb-1.5 block">Nome completo *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-sm text-[#9ca3af] mb-1.5 block">Celular *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input type="tel" required value={phone} onChange={e => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-sm text-[#9ca3af] mb-1.5 block">E-mail *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="E-mail"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-sm text-[#9ca3af] mb-1.5 block">Senha *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input type={show ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-10 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors" />
              <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Indicador de força de senha */}
            {password.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="flex-1 h-full rounded-full transition-all duration-300"
                        style={{ background: i < forcaSenha.pontos ? forcaCor : '#2a2a2a' }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: forcaCor }}>{forcaLabel}</span>
                </div>
                <ul className="space-y-1">
                  {forcaSenha.criterios.map(c => (
                    <li key={c.label} className="flex items-center gap-1.5 text-xs">
                      {c.ok
                        ? <Check className="w-3.5 h-3.5 text-[#b2ea0f]" />
                        : <XIcon className="w-3.5 h-3.5 text-[#9ca3af]" />}
                      <span className={c.ok ? 'text-[#d1d5db]' : 'text-[#9ca3af]'}>{c.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-[#9ca3af] mb-1.5 block">Confirmar senha *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input type={show ? 'text' : 'password'} required value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="btn-green py-3 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-[#9ca3af] mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-[#b2ea0f] font-semibold hover:underline">Entrar</Link>
        </p>
        <div className="flex justify-center mt-4">
          <Link href="/" className="inline-flex items-center px-5 py-2 rounded-full bg-[#b2ea0f] text-black text-sm font-semibold hover:bg-[#c8f040] transition-colors duration-200">
            Voltar à loja
          </Link>
        </div>
      </div>
    </div>
  )
}

