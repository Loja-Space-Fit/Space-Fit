'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  address: Record<string, string> | null
  is_admin: boolean | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const router   = useRouter()
  const [user, setUser]       = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data ?? null)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Refresh token inválido — limpar sessão localmente
        supabase.auth.signOut()
        setLoading(false)
        return
      }
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  async function signIn(identifier: string, password: string) {
    // Verificar se o usuário existe (email ou celular)
    try {
      const res = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      })
      const { exists, email: resolvedEmail } = await res.json()

      if (!exists) {
        return { error: 'not_found' }
      }

      // Usar o email resolvido (caso identificador seja celular)
      const loginEmail = resolvedEmail ?? identifier

      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return { error: 'not_confirmed' }
        }
        return { error: 'wrong_password' }
      }
      return { error: null }
    } catch {
      return { error: 'network_error' }
    }
  }

  async function signUp(email: string, password: string, name: string, phone: string) {
    // Cadastro server-side: usa admin.generateLink para criar o usuário e enviar
    // email customizado com botão de confirmação (sem email automático do Supabase)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nome: name, phone }),
    })
    const json = await res.json()

    if (!res.ok) {
      if (json.error === 'already_registered') return { error: 'already registered' }
      return { error: json.error ?? 'Erro ao criar conta.' }
    }

    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
    router.push('/login')
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
