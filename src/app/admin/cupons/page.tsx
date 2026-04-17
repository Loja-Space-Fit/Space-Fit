'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Loader2, Tag, Calendar } from 'lucide-react'
import CalendarioInput from '@/components/admin/CalendarioInput'
import toast from 'react-hot-toast'
import type { Coupon } from '@/types'

export default function AdminCouponsPage() {
  const [coupons, setCoupons]   = useState<Coupon[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Coupon | null>(null)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({
    code: '', type: 'percent' as 'percent' | 'fixed',
    value: '', min_order: '', max_uses: '', unlimited: true,
    hasValidity: false, starts_at: '', expires_at: '',
    active: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
    // Auto-desativar cupons expirados
    const now = new Date()
    const toDeactivate = (data || []).filter((c: Coupon) => c.active && c.expires_at && new Date(c.expires_at) < now)
    if (toDeactivate.length > 0) {
      await Promise.all(toDeactivate.map((c: Coupon) =>
        supabase.from('coupons').update({ active: false }).eq('id', c.id)
      ))
      const { data: updated } = await supabase.from('coupons').select('*').order('created_at', { ascending: false })
      setCoupons((updated || []) as Coupon[])
    } else {
      setCoupons((data || []) as Coupon[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Trava scroll da página enquanto modal aberto
  useEffect(() => {
    document.body.style.overflow = showForm ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showForm])

  function openCreate() {
    setEditing(null)
    setForm({ code: '', type: 'percent', value: '', min_order: '0', max_uses: '', unlimited: true, hasValidity: false, starts_at: '', expires_at: '', active: true })
    setShowForm(true)
  }

  function openEdit(c: Coupon) {
    setEditing(c)
    setForm({
      code: c.code, type: c.type, value: String(c.value),
      min_order: String(c.min_order), max_uses: c.max_uses ? String(c.max_uses) : '',
      hasValidity: !!c.expires_at,
      unlimited: !c.max_uses,
      starts_at: c.starts_at ? c.starts_at.split('T')[0] : '',
      expires_at: c.expires_at ? c.expires_at.split('T')[0] : '',
      active: c.active,
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const data = {
      code:       form.code.toUpperCase().trim(),
      type:       form.type,
      value:      parseFloat(form.value),
      min_order:  parseFloat(form.min_order) || 0,
      max_uses:   form.unlimited ? null : (form.max_uses ? parseInt(form.max_uses) : null),
      // Fim do dia em UTC para evitar desvio de fuso horário
      expires_at: form.hasValidity && form.expires_at ? `${form.expires_at}T23:59:59.000Z` : null,
      starts_at:  form.hasValidity && form.starts_at  ? `${form.starts_at}T00:00:00.000Z`  : null,
      active:     form.active,
    }

    let saveError: { message: string } | null = null

    if (editing) {
      let { error } = await supabase.from('coupons').update(data).eq('id', editing.id)
      // Fallback se coluna starts_at ainda não existir
      if (error?.message?.toLowerCase().includes('starts_at')) {
        const { starts_at: _, ...dataWithout } = data
        const res = await supabase.from('coupons').update(dataWithout).eq('id', editing.id)
        error = res.error
      }
      saveError = error
    } else {
      let { error } = await supabase.from('coupons').insert(data)
      if (error?.message?.toLowerCase().includes('starts_at')) {
        const { starts_at: _, ...dataWithout } = data
        const res = await supabase.from('coupons').insert(dataWithout)
        error = res.error
      }
      saveError = error
    }

    if (saveError) {
      toast.error(`Erro: ${saveError.message}`)
    } else {
      setShowForm(false)
      load()
      toast.success(editing ? 'Cupom atualizado.' : 'Cupom criado.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string, code: string) {
    if (!confirm(`Excluir o cupom "${code}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('coupons').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir cupom.')
    } else {
      setCoupons(prev => prev.filter(c => c.id !== id))
      toast.success(`Cupom "${code}" excluído.`)
    }
  }

  // Formata ISO → DD/MM/AAAA sem conversão de fuso
  function formatDate(iso: string) {
    return iso.split('T')[0].split('-').reverse().join('/')
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Cupons de Desconto</h1>
          <p className="text-[#9ca3af] text-sm">{coupons.length} cupom{coupons.length !== 1 ? 'ns' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-green gap-2">
          <Plus className="w-4 h-4" /> Novo Cupom
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
          <div className="w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <h2 className="font-black text-white">{editing ? 'Editar Cupom' : 'Novo Cupom'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-[#9ca3af]" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Código do Cupom *</label>
                <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required className="input font-mono font-bold tracking-widest" placeholder="SPACEFIT10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Tipo de desconto</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'percent' | 'fixed' }))} className="input">
                    <option value="percent">Porcentagem (%)</option>
                    <option value="fixed">Valor fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">
                    {form.type === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'} *
                  </label>
                  <input value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} required type="number" step="0.01" min="0" className="input" placeholder={form.type === 'percent' ? '10' : '20.00'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Pedido mínimo (R$)</label>
                  <input value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} type="number" step="0.01" min="0" className="input" placeholder="0" />
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Limite de usos</label>
                  <input
                    value={form.unlimited ? '' : form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                    type="number" min="1"
                    className="input"
                    placeholder="Ex: 100"
                    disabled={form.unlimited}
                    required={!form.unlimited}
                  />
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, unlimited: !f.unlimited, max_uses: '' }))}
                    className={`mt-2 w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                      form.unlimited
                        ? 'bg-[#b2ea0f]/10 border-[#b2ea0f]/40 text-[#b2ea0f]'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#9ca3af] hover:border-[#b2ea0f]/30'
                    }`}
                  >
                    <span className="text-xs font-semibold">Ilimitado</span>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${
                      form.unlimited ? 'bg-[#b2ea0f]' : 'bg-[#2a2a2a]'
                    }`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${
                        form.unlimited ? 'left-4' : 'left-0.5'
                      }`} />
                    </div>
                  </button>
                </div>
              </div>
              {/* Toggle Validade */}
              <div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, hasValidity: !f.hasValidity, starts_at: '', expires_at: '' }))}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                    form.hasValidity
                      ? 'bg-[#b2ea0f]/10 border-[#b2ea0f]/50 text-[#b2ea0f]'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#9ca3af] hover:border-[#b2ea0f]/30 hover:text-white'
                  }`}
                >
                  <div className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                    form.hasValidity ? 'bg-[#b2ea0f] text-black' : 'bg-[#2a2a2a] text-[#9ca3af]'
                  }`}>
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-semibold">Validade</span>
                  <span className="text-xs opacity-60">{form.hasValidity ? 'ativada' : '(clique para definir)'}</span>
                </button>

                {form.hasValidity && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <CalendarioInput
                      label="Data de início"
                      value={form.starts_at}
                      onChange={v => setForm(f => ({
                        ...f,
                        starts_at: v,
                        // Limpa a data de fim se ela for anterior à nova data de início
                        expires_at: f.expires_at && v && f.expires_at < v ? '' : f.expires_at,
                      }))}
                      maxDate={form.expires_at || undefined}
                      placeholder="Selecionar"
                    />
                    <CalendarioInput
                      label="Data de fim"
                      value={form.expires_at}
                      onChange={v => setForm(f => ({ ...f, expires_at: v }))}
                      minDate={form.starts_at || undefined}
                      required
                      placeholder="Selecionar"
                    />
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-[#b2ea0f]" />
                <span className="text-sm text-white">Cupom ativo</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-green flex-1">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : (editing ? 'Salvar' : 'Criar Cupom')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-[#9ca3af]">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map(c => {
            const now = new Date()
            const expired    = c.expires_at && new Date(c.expires_at) < now
            const notStarted = c.starts_at  && new Date(c.starts_at)  > now
            return (
              <div key={c.id} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#b2ea0f]" />
                    <span className="font-black text-white font-mono tracking-widest text-lg">{c.code}</span>
                  </div>
                  <span className={`badge ${c.active && !expired && !notStarted ? 'bg-[#b2ea0f]/20 text-[#b2ea0f]' : 'bg-[#2a2a2a] text-[#9ca3af]'}`}>
                    {expired ? 'Expirado' : notStarted ? 'Agendado' : c.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="text-2xl font-black text-[#b2ea0f] mb-1">
                  {c.type === 'percent' ? `${c.value}% OFF` : `${formatBRL(c.value)} OFF`}
                </p>
                {c.min_order > 0 && <p className="text-xs text-[#9ca3af]">Mínimo: {formatBRL(c.min_order)}</p>}
                {c.max_uses && <p className="text-xs text-[#9ca3af]">Usos: {c.uses_count}/{c.max_uses}</p>}
                {(c.starts_at || c.expires_at) && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex items-center justify-center w-5 h-5 rounded bg-[#b2ea0f]/20">
                      <Calendar className="w-3 h-3 text-[#b2ea0f]" />
                    </div>
                    <p className="text-xs text-[#9ca3af]">
                      {c.starts_at ? formatDate(c.starts_at) : '∞'} → {c.expires_at ? formatDate(c.expires_at) : '∞'}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-3 border-t border-[#2a2a2a] mt-3">
                  <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#b2ea0f] transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => handleDelete(c.id, c.code)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-red-400 transition-colors ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>
            )
          })}
          {!coupons.length && (
            <div className="col-span-3 py-12 text-center text-[#9ca3af]">Nenhum cupom criado ainda.</div>
          )}
        </div>
      )}
    </div>
  )
}
