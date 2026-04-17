'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Loader2, RefreshCw } from 'lucide-react'
import type { SubscriptionPlan, Subscription } from '@/types'

export default function AdminSubscriptionsPage() {
  const [plans, setPlans]               = useState<SubscriptionPlan[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<SubscriptionPlan | null>(null)
  const [saving, setSaving]             = useState(false)
  const [form, setForm]                 = useState({ name: '', description: '', price: '', interval_days: '30', active: true })

  const statusLabels: Record<string, string> = { active: 'Ativa', paused: 'Pausada', cancelled: 'Cancelada', expired: 'Expirada' }
  const statusColors: Record<string, string> = {
    active:    'bg-[#b2ea0f]/20 text-[#b2ea0f]',
    paused:    'bg-yellow-900/20 text-yellow-400',
    cancelled: 'bg-red-900/20 text-red-400',
    expired:   'bg-[#2a2a2a] text-[#9ca3af]',
  }

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('subscription_plans').select('*').order('price'),
      supabase.from('subscriptions').select('*, plan:subscription_plans(name)').order('created_at', { ascending: false }).limit(50),
    ])
    setPlans((p || []) as SubscriptionPlan[])
    setSubscriptions((s || []) as unknown as Subscription[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '', price: '', interval_days: '30', active: true })
    setShowForm(true)
  }

  function openEdit(plan: SubscriptionPlan) {
    setEditing(plan)
    setForm({ name: plan.name, description: plan.description || '', price: String(plan.price), interval_days: String(plan.interval_days), active: plan.active })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const data = { name: form.name, description: form.description || null, price: parseFloat(form.price), interval_days: parseInt(form.interval_days) || 30, active: form.active }
    if (editing) {
      await supabase.from('subscription_plans').update(data).eq('id', editing.id)
    } else {
      await supabase.from('subscription_plans').insert(data)
    }
    setShowForm(false)
    load()
    setSaving(false)
  }

  async function handleDeletePlan(id: string, name: string) {
    if (!confirm(`Excluir o plano "${name}"? Assinaturas existentes não serão afetadas.`)) return
    const supabase = createClient()
    await supabase.from('subscription_plans').delete().eq('id', id)
    setPlans(prev => prev.filter(p => p.id !== id))
  }

  async function updateSubscriptionStatus(id: string, status: 'active' | 'paused' | 'cancelled' | 'expired') {
    const supabase = createClient()
    await supabase.from('subscriptions').update({ status }).eq('id', id)
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  return (
    <div className="space-y-10">
      {/* === PLANOS === */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Assinaturas</h1>
            <p className="text-[#9ca3af] text-sm">Gerencie planos e assinantes</p>
          </div>
          <button onClick={openCreate} className="btn-green gap-2">
            <Plus className="w-4 h-4" /> Novo Plano
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-2xl">
              <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
                <h2 className="font-black text-white">{editing ? 'Editar Plano' : 'Novo Plano'}</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-[#9ca3af]" /></button>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Nome do Plano *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="input" placeholder="Ex: Plano Mensal Premium" />
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Descrição</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" rows={2} placeholder="Benefícios do plano..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-[#9ca3af] mb-1 block">Preço (R$/período) *</label>
                    <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required type="number" step="0.01" min="0" className="input" placeholder="99.90" />
                  </div>
                  <div>
                    <label className="text-sm text-[#9ca3af] mb-1 block">Intervalo (dias)</label>
                    <input value={form.interval_days} onChange={e => setForm(f => ({ ...f, interval_days: e.target.value }))} type="number" min="1" className="input" placeholder="30" />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-[#b2ea0f]" />
                  <span className="text-sm text-white">Plano ativo (aceita novos assinantes)</span>
                </label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-green flex-1">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : (editing ? 'Salvar' : 'Criar Plano')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-[#9ca3af]">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {plans.map(plan => {
              const subs = subscriptions.filter(s => s.plan_id === plan.id && s.status === 'active').length
              return (
                <div key={plan.id} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-white">{plan.name}</h3>
                    <span className={`badge ${plan.active ? 'bg-[#b2ea0f]/20 text-[#b2ea0f]' : 'bg-[#2a2a2a] text-[#9ca3af]'}`}>
                      {plan.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {plan.description && <p className="text-sm text-[#9ca3af] mb-3">{plan.description}</p>}
                  <p className="text-2xl font-black text-white">{formatBRL(plan.price)}</p>
                  <p className="text-xs text-[#9ca3af] mb-2">a cada {plan.interval_days} dias</p>
                  <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
                    <RefreshCw className="w-3 h-3 text-[#b2ea0f]" />
                    <span>{subs} assinante{subs !== 1 ? 's' : ''} ativo{subs !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-[#2a2a2a] mt-3">
                    <button onClick={() => openEdit(plan)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#b2ea0f] transition-colors">
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button onClick={() => handleDeletePlan(plan.id, plan.name)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-red-400 transition-colors ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </div>
              )
            })}
            {!plans.length && <div className="col-span-3 py-10 text-center text-[#9ca3af]">Nenhum plano criado.</div>}
          </div>
        )}
      </section>

      {/* === ASSINANTES === */}
      <section>
        <h2 className="text-xl font-black text-white mb-4">Assinantes</h2>
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-xs text-[#9ca3af] uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-left px-5 py-3">Plano</th>
                  <th className="text-left px-5 py-3">Próx. cobrança</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map(s => (
                  <tr key={s.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-white">{s.customer_name}</p>
                      <p className="text-xs text-[#9ca3af]">{s.customer_phone}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#9ca3af]">
                      {(s.plan as unknown as {name:string})?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-white">
                      {s.next_billing_date ? new Date(s.next_billing_date).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`badge ${statusColors[s.status] || ''}`}>{statusLabels[s.status] || s.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <select
                        value={s.status}
                        onChange={e => updateSubscriptionStatus(s.id, e.target.value as 'active' | 'paused' | 'cancelled' | 'expired')}
                        className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-white outline-none hover:border-[#b2ea0f] transition-colors"
                      >
                        <option value="active">Ativa</option>
                        <option value="paused">Pausada</option>
                        <option value="cancelled">Cancelada</option>
                        <option value="expired">Expirada</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {!subscriptions.length && (
                  <tr><td colSpan={5} className="py-10 text-center text-[#9ca3af]">Nenhum assinante ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
