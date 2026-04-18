'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatBRL } from '@/lib/utils'
import { useFavorites } from '@/context/FavoritesContext'
import Image from 'next/image'
import Link from 'next/link'
import {
  User, Package, Star, LogOut, Edit2, Save, X,
  ChevronRight, Loader2, ShoppingBag, Phone, Mail, MapPin, KeyRound, Eye, EyeOff, Heart,
} from 'lucide-react'

type Tab = 'pedidos' | 'perfil' | 'fidelidade' | 'favoritos'

interface FavProduct {
  id: string
  name: string
  slug: string
  price: number
  images: string[]
}

interface Order {
  id: string
  order_number: string
  total: number
  order_status: string
  payment_status: string
  created_at: string
  items: { product_name: string; quantity: number; unit_price: number }[]
}

interface LoyaltyAccount {
  points: number
  total_spent: number
}

const orderStatusLabel: Record<string, string> = {
  pending:   'Aguardando',
  paid:      'Pago',
  preparing: 'Preparando',
  shipped:   'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}
const orderStatusColor: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-400',
  paid:      'bg-blue-500/20 text-blue-400',
  preparing: 'bg-orange-500/20 text-orange-400',
  shipped:   'bg-purple-500/20 text-purple-400',
  delivered: 'bg-[#b2ea0f]/20 text-[#b2ea0f]',
  cancelled: 'bg-red-500/20 text-red-400',
}

function MinhaContaPageInner() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth()
  const { favorites, toggle } = useFavorites()
  const router = useRouter()
  const searchParams = useSearchParams()
  // Instância estável — não muda entre renders, evita loop infinito no fetchData
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const validTabs: Tab[] = ['pedidos', 'perfil', 'fidelidade', 'favoritos']
  const tabParam = searchParams.get('tab') as Tab | null
  const [tab, setTab] = useState<Tab>(validTabs.includes(tabParam as Tab) ? tabParam as Tab : 'pedidos')

  // Atualiza a tab e persiste na URL para sobreviver ao refresh
  function changeTab(t: Tab) {
    setTab(t)
    router.replace(`/minha-conta?tab=${t}`, { scroll: false })
  }

  // Sync tab quando URL muda externamente (ex: link do header)
  useEffect(() => {
    const t = searchParams.get('tab') as Tab | null
    if (t && validTabs.includes(t)) setTab(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  const [orders, setOrders]   = useState<Order[]>([])
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null)
  const [loyaltyTx, setLoyaltyTx] = useState<{ points: number; type: string; description: string; created_at: string }[]>([])
  const [favProducts, setFavProducts] = useState<FavProduct[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const dataFetched = useRef(false)

  // Edit profile state
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg]         = useState('')
  const [pwError, setPwError]     = useState('')
  const [showPwForm, setShowPwForm]   = useState(false)
  const [currentPw, setCurrentPw]     = useState('')
  const [newPw, setNewPw]             = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw]         = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [editName, setEditName]   = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editStreet, setEditStreet]   = useState('')
  const [editNumber, setEditNumber]   = useState('')
  const [editNeighborhood, setEditNeighborhood] = useState('')
  const [editCity, setEditCity]   = useState('')
  const [editState, setEditState] = useState('')
  const [editCep, setEditCep]     = useState('')

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  const fetchData = useCallback(async () => {
    if (!user) return
    // Só mostra spinner na primeira carga — evita flash no alt+tab
    if (!dataFetched.current) setLoadingData(true)

    const [{ data: ordersData }, loyaltyRes, favRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_number, total, order_status, payment_status, created_at, items')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      // Busca via API server-side (service role) — evita bloqueio de RLS e formato de telefone
      fetch('/api/loyalty/me').then(r => r.json()).catch(() => ({ account: null, transactions: [] })),
      // Favoritos
      (async () => {
        const favIds = Array.from(favorites)
        if (favIds.length === 0) return { data: [] }
        return supabase.from('products').select('id, name, slug, price, images').in('id', favIds)
      })(),
    ])

    setOrders((ordersData as Order[]) ?? [])
    setLoyalty(loyaltyRes.account ?? null)
    setLoyaltyTx(loyaltyRes.transactions ?? [])
    setFavProducts(((favRes as { data: FavProduct[] | null }).data as FavProduct[]) ?? [])

    dataFetched.current = true
    setLoadingData(false)
  }, [user, supabase, favorites])

  useEffect(() => {
    if (user) fetchData()
  }, [user, fetchData])

  // Re-sync favProducts when favorites Set changes (toggle from card)
  useEffect(() => {
    if (!user) { setFavProducts([]); return }
    const favIds = Array.from(favorites)
    if (favIds.length === 0) { setFavProducts([]); return }
    const sb = createClient()
    sb
      .from('products')
      .select('id, name, slug, price, images')
      .in('id', favIds)
      .then(({ data }) => setFavProducts((data as FavProduct[]) ?? []))
  }, [favorites, user])

  function startEdit() {
    const addr = profile?.address as Record<string, string> | null
    setEditName(profile?.full_name ?? '')
    setEditPhone(profile?.phone ?? '')
    setEditStreet(addr?.street ?? '')
    setEditNumber(addr?.number ?? '')
    setEditNeighborhood(addr?.neighborhood ?? '')
    setEditCity(addr?.city ?? '')
    setEditState(addr?.state ?? '')
    setEditCep(addr?.cep ?? '')
    setEditing(true)
  }

  async function sendPasswordReset() {
    if (!user?.email) return
    setPwError('')
    setPwMsg('')
    if (!currentPw) { setPwError('Informe sua senha atual.'); return }
    if (newPw.length < 8) { setPwError('A nova senha deve ter pelo menos 8 caracteres.'); return }
    if (!/[A-Z]/.test(newPw)) { setPwError('A nova senha deve ter pelo menos uma letra maiúscula.'); return }
    if (!/[^A-Za-z0-9]/.test(newPw)) { setPwError('A nova senha deve ter pelo menos um caractere especial (!@#$...).'); return }
    if (newPw !== confirmPw) { setPwError('As senhas não coincidem.'); return }
    setPwLoading(true)
    // Verify current password by re-signing in
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw })
    if (signInErr) {
      setPwLoading(false)
      setPwError('Senha atual incorreta.')
      return
    }
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)
    if (updateErr) {
      setPwError('Erro ao atualizar senha. Tente novamente.')
    } else {
      setPwMsg('Senha atualizada com sucesso!')
      setShowPwForm(false)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    }
  }

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: editName,
      phone: editPhone.replace(/\D/g, '') || editPhone,
      email: user.email,
      address: { street: editStreet, number: editNumber, neighborhood: editNeighborhood, city: editCity, state: editState, cep: editCep },
    })
    await refreshProfile()
    setEditing(false)
    setSaving(false)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#b2ea0f] animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Minha Conta</h1>
          <p className="text-[#9ca3af] text-sm mt-0.5">
            Olá, <span className="text-white font-semibold">{profile?.full_name?.split(' ')[0] || user.email}</span>!
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-[#9ca3af] hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#111111] border border-[#2a2a2a] rounded-xl p-1">
        {([
          { id: 'pedidos',    label: 'Pedidos',      icon: Package },
          { id: 'favoritos',  label: 'Favoritos',    icon: Heart },
          { id: 'fidelidade', label: 'Space Points',  icon: Star },
          { id: 'perfil',     label: 'Perfil',        icon: User },
        ] as { id: Tab; label: string; icon: React.FC<{ className?: string }> }[]).map(t => (
          <button
            key={t.id}
            onClick={() => changeTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-[#b2ea0f] text-black'
                : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* === TAB: PEDIDOS === */}
      {tab === 'pedidos' && (
        <div>
          {loadingData ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#b2ea0f] animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-14 h-14 text-[#9ca3af] mx-auto mb-3 opacity-30" />
              <p className="text-white font-semibold">Nenhum pedido ainda</p>
              <p className="text-[#9ca3af] text-sm mb-4">Seus pedidos aparecerão aqui.</p>
              <a href="/" className="btn-green text-sm py-2 px-6 rounded-lg inline-block">Ver Produtos</a>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {orders.map(order => (
                <div key={order.id} className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-[#b2ea0f] font-black text-sm">{order.order_number}</span>
                      <p className="text-xs text-[#9ca3af] mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${orderStatusColor[order.order_status] || 'bg-[#2a2a2a] text-[#9ca3af]'}`}>
                      {orderStatusLabel[order.order_status] || order.order_status}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 mb-3">
                    {(order.items as { product_name: string; quantity: number }[]).map((item, i) => (
                      <p key={i} className="text-sm text-[#9ca3af]">
                        {item.quantity}x {item.product_name}
                      </p>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#2a2a2a]">
                    <span className="text-sm text-[#9ca3af]">Total</span>
                    <span className="text-[#b2ea0f] font-black">{formatBRL(order.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === TAB: PERFIL === */}
      {tab === 'perfil' && (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-white">Dados Pessoais</h2>
            {!editing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-sm text-[#b2ea0f] hover:underline"
              >
                <Edit2 className="w-4 h-4" /> Editar
              </button>
            ) : (
              <button
                onClick={() => setEditing(false)}
                className="flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-white"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
            )}
          </div>

          {!editing ? (
            <div className="flex flex-col gap-4">
              <InfoRow icon={<User className="w-4 h-4 text-[#b2ea0f]" />} label="Nome" value={profile?.full_name || '—'} />
              <InfoRow icon={<Mail className="w-4 h-4 text-[#b2ea0f]" />} label="E-mail" value={user.email || '—'} />
              <InfoRow icon={<Phone className="w-4 h-4 text-[#b2ea0f]" />} label="Telefone" value={profile?.phone || '—'} />
              <InfoRow
                icon={<MapPin className="w-4 h-4 text-[#b2ea0f]" />}
                label="Endereço"
                value={
                  profile?.address
                    ? `${(profile.address as Record<string,string>).street || ''}, ${(profile.address as Record<string,string>).number || ''} — ${(profile.address as Record<string,string>).city || ''}`
                    : '—'
                }
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Nome completo *" value={editName} onChange={setEditName} />
              <Field label="Telefone / WhatsApp *" value={editPhone} onChange={setEditPhone} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="CEP" value={editCep} onChange={setEditCep} />
                <Field label="Número" value={editNumber} onChange={setEditNumber} />
              </div>
              <Field label="Rua" value={editStreet} onChange={setEditStreet} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Bairro" value={editNeighborhood} onChange={setEditNeighborhood} />
                <Field label="Cidade" value={editCity} onChange={setEditCity} />
              </div>
              <Field label="Estado" value={editState} onChange={setEditState} placeholder="Ex: MG" />

              <button
                onClick={saveProfile}
                disabled={saving}
                className="btn-green py-3 flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          )}

          {/* Alterar senha */}
          <div className="mt-6 pt-6 border-t border-[#2a2a2a]">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#b2ea0f]" /> Alterar Senha
            </h3>
            {pwMsg && (
              <p className="text-xs mb-3 p-2 rounded-lg text-[#b2ea0f] bg-[#b2ea0f]/10">{pwMsg}</p>
            )}
            {!showPwForm ? (
              <button
                onClick={() => { setShowPwForm(true); setPwMsg(''); setPwError('') }}
                className="btn-outline text-sm py-2 px-4 flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" /> Alterar senha
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                {pwError && (
                  <p className="text-xs p-2 rounded-lg text-red-400 bg-red-500/10">{pwError}</p>
                )}
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block">Senha atual</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPw}
                      onChange={e => setCurrentPw(e.target.value)}
                      placeholder="Sua senha atual"
                      className="input w-full text-sm pr-10"
                    />
                    <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b2ea0f] hover:text-[#c8f040] transition-colors">
                      {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="input w-full text-sm pr-10"
                    />
                    <button type="button" onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b2ea0f] hover:text-[#c8f040] transition-colors">
                      {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPw && (
                    <ul className="mt-2 space-y-1">
                      {[
                        { label: 'Mínimo 8 caracteres',                        ok: newPw.length >= 8 },
                        { label: 'Pelo menos uma letra maiúscula',             ok: /[A-Z]/.test(newPw) },
                        { label: 'Pelo menos um caractere especial (!@#$...)', ok: /[^A-Za-z0-9]/.test(newPw) },
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
                  <label className="text-xs text-[#9ca3af] mb-1 block">Confirmar nova senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="input w-full text-sm pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b2ea0f] hover:text-[#c8f040] transition-colors">
                      {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={sendPasswordReset}
                    disabled={pwLoading}
                    className="btn-green text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-60"
                  >
                    {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {pwLoading ? 'Salvando...' : 'Salvar nova senha'}
                  </button>
                  <button
                    onClick={() => { setShowPwForm(false); setPwError(''); setCurrentPw(''); setNewPw(''); setConfirmPw('') }}
                    className="btn-outline text-sm py-2 px-4"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === TAB: FIDELIDADE === */}
      {tab === 'fidelidade' && (
        <div className="space-y-6">
          {loadingData ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#b2ea0f] animate-spin" />
            </div>
          ) : (
            <>
              {/* Card principal */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a1a] via-[#111111] to-[#0d0d0d] border border-[#b2ea0f]/20 p-6">
                {/* Glow */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#b2ea0f]/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[#b2ea0f]/5 blur-2xl pointer-events-none" />

                <div className="relative flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-[#b2ea0f]" />
                      <span className="text-xs font-bold text-[#b2ea0f] uppercase tracking-widest">Space Points</span>
                    </div>
                    <p className="text-[#9ca3af] text-sm">{profile?.full_name || 'Cliente'}</p>
                  </div>
                  {/* Logo */}
                  <div className="w-14 h-14 rounded-xl bg-[#b2ea0f]/10 border border-[#b2ea0f]/30 flex items-center justify-center overflow-hidden">
                    <img src="/imagens/logo.png" alt="Space Fit" className="w-full h-full object-contain p-1" />
                  </div>
                </div>

                {/* Pontos grandes */}
                <div className="mb-6">
                  <p className="text-6xl font-black text-[#b2ea0f] leading-none">
                    {(loyalty?.points ?? 0).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-[#9ca3af] text-sm mt-1">pontos acumulados — vale {formatBRL(loyalty?.points ?? 0)}</p>
                </div>

                {/* Stats */}
                <div className="flex gap-4">
                  <div className="flex-1 bg-[#0a0a0a]/60 rounded-xl p-3 border border-[#2a2a2a]">
                    <p className="text-xs text-[#9ca3af] mb-0.5">Total gasto</p>
                    <p className="text-white font-black">{formatBRL(loyalty?.total_spent ?? 0)}</p>
                  </div>
                  <div className="flex-1 bg-[#0a0a0a]/60 rounded-xl p-3 border border-[#2a2a2a]">
                    <p className="text-xs text-[#9ca3af] mb-0.5">Cashback acumulado</p>
                    <p className="text-white font-black">{formatBRL(loyalty?.points ?? 0)}</p>
                  </div>
                </div>

                {/* Como funciona */}
                <div className="mt-4 pt-4 border-t border-[#2a2a2a] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#b2ea0f] shrink-0" />
                  <p className="text-xs text-[#9ca3af]">A cada compra confirmada você ganha <span className="text-[#b2ea0f] font-bold">1 ponto por real gasto</span>. Use todos os pontos como desconto no checkout.</p>
                </div>
              </div>

              {/* Histórico */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-[#b2ea0f]" /> Histórico de pontos
                </h3>
                {loyaltyTx.length === 0 ? (
                  <div className="text-center py-10 bg-[#111111] border border-[#2a2a2a] rounded-xl">
                    <Star className="w-10 h-10 text-[#9ca3af] mx-auto mb-2 opacity-30" />
                    <p className="text-[#9ca3af] text-sm">Nenhuma movimentação ainda.</p>
                    <p className="text-[#9ca3af] text-xs mt-1">Seus pontos aparecem aqui após o pagamento ser confirmado.</p>
                  </div>
                ) : (
                  <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden">
                    {loyaltyTx.map((tx, i) => (
                      <div key={i} className={`flex items-center justify-between px-4 py-3 ${
                        i < loyaltyTx.length - 1 ? 'border-b border-[#1a1a1a]' : ''
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            tx.type === 'earn' ? 'bg-[#b2ea0f]/15' : 'bg-red-500/15'
                          }`}>
                            <Star className={`w-4 h-4 ${
                              tx.type === 'earn' ? 'text-[#b2ea0f]' : 'text-red-400'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm text-white font-semibold">{tx.description}</p>
                            <p className="text-xs text-[#9ca3af]">
                              {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <p className={`text-sm font-black ${
                          tx.points > 0 ? 'text-[#b2ea0f]' : 'text-red-400'
                        }`}>
                          {tx.points > 0 ? '+' : ''}{tx.points} pts
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'favoritos' && (
        <div>
          {loadingData ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#b2ea0f] animate-spin" />
            </div>
          ) : favProducts.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-14 h-14 text-[#9ca3af] mx-auto mb-3 opacity-30" />
              <p className="text-white font-semibold">Nenhum favorito ainda</p>
              <p className="text-[#9ca3af] text-sm mt-1">Clique no coração nos produtos para salvá-los aqui.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {favProducts.map(p => (
                <div key={p.id} className="bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden group">
                  <Link href={`/produto/${p.slug}`} className="block relative aspect-square overflow-hidden bg-[#1a1a1a]">
                    {p.images?.[0] ? (
                      <Image
                        src={p.images[0]}
                        alt={p.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#9ca3af] text-xs">Sem imagem</div>
                    )}
                  </Link>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{p.name}</p>
                      <p className="text-[#b2ea0f] font-black text-sm">{formatBRL(p.price)}</p>
                    </div>
                    <button
                      onClick={() => toggle(p.id)}
                      className="shrink-0 w-8 h-8 rounded-full bg-[#b2ea0f] flex items-center justify-center hover:bg-[#c8f040] transition-colors scale-110"
                    >
                      <Heart className="w-4 h-4 fill-black text-black" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-[#9ca3af]">{label}</p>
        <p className="text-white font-semibold text-sm">{value}</p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm text-[#9ca3af] mb-1.5 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#b2ea0f] transition-colors"
      />
    </div>
  )
}

export default function MinhaContaPage() {
  return (
    <Suspense>
      <MinhaContaPageInner />
    </Suspense>
  )
}
