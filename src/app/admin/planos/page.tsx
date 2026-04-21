'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, GripVertical, Clock } from 'lucide-react'
import { formatBRL } from '@/lib/utils'

type Plan = {
  id: string
  region: string
  name: string
  period_label: string
  price: number
  price_total: number | null
  installments: number
  highlight: boolean
  features: string[] | null
  active: boolean
  display_order: number
}

type Hours = {
  id: string
  region: string
  day_label: string
  hours: string
  display_order: number
}

const REGIONS = [
  { value: 'conceicao', label: 'Conceição das Alagoas' },
  { value: 'guaira',    label: 'Guaíra' },
]

const EMPTY_PLAN: Omit<Plan, 'id'> = {
  region: 'conceicao',
  name: '',
  period_label: '',
  price: 0,
  price_total: null,
  installments: 1,
  highlight: false,
  features: [],
  active: true,
  display_order: 0,
}

export default function PlanosAdminPage() {
  const [activeRegion, setActiveRegion] = useState('conceicao')
  const [activeTab, setActiveTab] = useState<'planos' | 'horarios'>('planos')
  const [plans, setPlans] = useState<Plan[]>([])
  const [hours, setHours] = useState<Hours[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<Omit<Plan, 'id'>>(EMPTY_PLAN)
  const [featuresText, setFeaturesText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  // Horários
  const [editingHourId, setEditingHourId] = useState<string | 'new' | null>(null)
  const [hourForm, setHourForm] = useState({ region: 'conceicao', day_label: '', hours: '', display_order: 1 })
  const [savingHour, setSavingHour] = useState(false)
  const [deleteHourId, setDeleteHourId] = useState<string | null>(null)

  const supabase = createClient()

  async function fetchPlans() {
    setLoading(true)
    const [{ data: p }, { data: h }] = await Promise.all([
      supabase.from('academy_plans').select('*').order('region').order('display_order'),
      supabase.from('academy_hours').select('*').order('region').order('display_order'),
    ])
    setPlans((p || []) as Plan[])
    setHours((h || []) as Hours[])
    setLoading(false)
  }

  useEffect(() => { fetchPlans() }, [])

  const regionPlans = plans.filter(p => p.region === activeRegion)

  function startNew() {
    setForm({ ...EMPTY_PLAN, region: activeRegion, display_order: regionPlans.length + 1 })
    setFeaturesText('')
    setEditingId('new')
  }

  function startEdit(p: Plan) {
    setForm({
      region: p.region, name: p.name, period_label: p.period_label,
      price: p.price, price_total: p.price_total, installments: p.installments,
      highlight: p.highlight, features: p.features, active: p.active,
      display_order: p.display_order,
    })
    setFeaturesText((p.features || []).join('\n'))
    setEditingId(p.id)
  }

  function cancel() { setEditingId(null) }

  async function save() {
    setSaving(true)
    const features = featuresText.split('\n').map(s => s.trim()).filter(Boolean)
    const payload = { ...form, features: features.length ? features : null }
    if (editingId === 'new') {
      await supabase.from('academy_plans').insert(payload)
    } else {
      await supabase.from('academy_plans').update(payload).eq('id', editingId)
    }
    await fetchPlans()
    setSaving(false)
    setEditingId(null)
  }

  async function deletePlan(id: string) {
    await supabase.from('academy_plans').delete().eq('id', id)
    setPlans(prev => prev.filter(p => p.id !== id))
    setDeleteId(null)
  }

  async function toggleActive(p: Plan) {
    await supabase.from('academy_plans').update({ active: !p.active }).eq('id', p.id)
    setPlans(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x))
  }

  // --- Horários ---
  const regionHours = hours.filter(h => h.region === activeRegion)

  function startNewHour() {
    setHourForm({ region: activeRegion, day_label: '', hours: '', display_order: regionHours.length + 1 })
    setEditingHourId('new')
  }

  function startEditHour(h: Hours) {
    setHourForm({ region: h.region, day_label: h.day_label, hours: h.hours, display_order: h.display_order })
    setEditingHourId(h.id)
  }

  async function saveHour() {
    setSavingHour(true)
    if (editingHourId === 'new') {
      await supabase.from('academy_hours').insert(hourForm)
    } else {
      await supabase.from('academy_hours').update(hourForm).eq('id', editingHourId)
    }
    await fetchPlans()
    setSavingHour(false)
    setEditingHourId(null)
  }

  async function deleteHour(id: string) {
    await supabase.from('academy_hours').delete().eq('id', id)
    setHours(prev => prev.filter(h => h.id !== id))
    setDeleteHourId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Planos da Academia</h1>
        <button
          onClick={activeTab === 'planos' ? startNew : startNewHour}
          className="btn-green flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> {activeTab === 'planos' ? 'Novo plano' : 'Novo horário'}
        </button>
      </div>

      {/* Seletor de unidade */}
      <div className="flex gap-3">
        {REGIONS.map(r => (
          <button
            key={r.value}
            onClick={() => { setActiveRegion(r.value); cancel() }}
            className={`px-5 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
              activeRegion === r.value
                ? 'bg-[#b2ea0f] text-black border-[#b2ea0f]'
                : 'bg-transparent text-[#9ca3af] border-[#2a2a2a] hover:border-[#b2ea0f]/50 hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Tabs Planos / Horários */}
      <div className="flex gap-1 bg-[#111111] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('planos')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'planos' ? 'bg-[#b2ea0f] text-black' : 'text-[#9ca3af] hover:text-white'}`}
        >
          Planos
        </button>
        <button
          onClick={() => setActiveTab('horarios')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'horarios' ? 'bg-[#b2ea0f] text-black' : 'text-[#9ca3af] hover:text-white'}`}
        >
          <Clock className="w-3.5 h-3.5" /> Horários
        </button>
      </div>

      {loading ? (
        <div className="text-[#9ca3af] py-10 text-center">Carregando...</div>
      ) : activeTab === 'planos' ? (
        <div className="space-y-3">
          {regionPlans.map(plan => (
            <div
              key={plan.id}
              className={`bg-[#111111] border rounded-xl p-4 flex items-center gap-4 ${
                plan.highlight ? 'border-[#b2ea0f]/40' : 'border-[#2a2a2a]'
              }`}
            >
              <GripVertical className="w-4 h-4 text-[#555] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-black text-sm ${plan.highlight ? 'text-[#b2ea0f]' : 'text-white'}`}>
                    {plan.name}
                  </span>
                  {plan.highlight && (
                    <span className="text-xs bg-[#b2ea0f]/20 text-[#b2ea0f] px-2 py-0.5 rounded-full font-bold">Premium</span>
                  )}
                  {!plan.active && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">Inativo</span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-0.5">
                  <span className="text-white font-black">{formatBRL(plan.price)}</span>
                  {plan.price_total && (
                    <span className="text-[#9ca3af] text-xs">{plan.installments}x = {formatBRL(plan.price_total)}</span>
                  )}
                  <span className="text-[#555] text-xs">{plan.period_label}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(plan)}
                  title={plan.active ? 'Desativar' : 'Ativar'}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    plan.active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#2a2a2a] text-[#555] hover:bg-[#333]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startEdit(plan)}
                  className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-[#9ca3af] hover:text-white hover:bg-[#333] transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(plan.id)}
                  className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-[#9ca3af] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {regionPlans.length === 0 && (
            <div className="text-center text-[#555] py-12 border-2 border-dashed border-[#2a2a2a] rounded-2xl">
              Nenhum plano cadastrado para esta unidade.<br />
              <button onClick={startNew} className="text-[#b2ea0f] hover:underline mt-2 text-sm">Criar o primeiro</button>
            </div>
          )}
        </div>
      ) : (
        /* ---- ABA HORÁRIOS ---- */
        <div className="space-y-3">
          {regionHours.map(h => (
            <div key={h.id} className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4">
              <Clock className="w-4 h-4 text-[#555] shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-white font-black text-sm">{h.day_label}</span>
                <span className={`ml-3 text-sm font-bold ${h.hours === 'Fechado' ? 'text-red-400' : 'text-[#b2ea0f]'}`}>{h.hours}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => startEditHour(h)} className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-[#9ca3af] hover:text-white hover:bg-[#333] transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteHourId(h.id)} className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-[#9ca3af] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {regionHours.length === 0 && (
            <div className="text-center text-[#555] py-12 border-2 border-dashed border-[#2a2a2a] rounded-2xl">
              Nenhum horário cadastrado para esta unidade.<br />
              <button onClick={startNewHour} className="text-[#b2ea0f] hover:underline mt-2 text-sm">Adicionar horário</button>
            </div>
          )}
        </div>
      )}

      {/* Modal de edição */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">
                  {editingId === 'new' ? 'Novo plano' : 'Editar plano'}
                </h2>
                <button onClick={cancel} className="text-[#9ca3af] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Nome do plano</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Mensal, Anual, Premium..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Preço mensal (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Total do período (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price_total ?? ''}
                    onChange={e => setForm(f => ({ ...f, price_total: e.target.value ? parseFloat(e.target.value) : null }))}
                    placeholder="Opcional"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    value={form.installments}
                    onChange={e => setForm(f => ({ ...f, installments: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Ordem</label>
                  <input
                    type="number"
                    min="1"
                    value={form.display_order}
                    onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Descrição do período</label>
                  <input
                    value={form.period_label}
                    onChange={e => setForm(f => ({ ...f, period_label: e.target.value }))}
                    placeholder="Ex: sem fidelidade, 12x sem juros..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">
                    Benefícios (um por linha)
                  </label>
                  <textarea
                    rows={4}
                    value={featuresText}
                    onChange={e => setFeaturesText(e.target.value)}
                    placeholder="Acesso ilimitado&#10;Avaliação física&#10;..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50 resize-none"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.highlight}
                      onChange={e => setForm(f => ({ ...f, highlight: e.target.checked }))}
                      className="accent-[#b2ea0f] w-4 h-4"
                    />
                    <span className="text-sm text-white font-semibold">Plano em destaque (Premium)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                      className="accent-[#b2ea0f] w-4 h-4"
                    />
                    <span className="text-sm text-white font-semibold">Ativo</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={cancel} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving || !form.name}
                  className="btn-green text-sm disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar plano'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão de plano */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full">
            <p className="text-white font-black mb-1">Excluir plano?</p>
            <p className="text-[#9ca3af] text-sm mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">
                Cancelar
              </button>
              <button
                onClick={() => deletePlan(deleteId)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-bold transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edição de horário */}
      {editingHourId !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">
                  {editingHourId === 'new' ? 'Novo horário' : 'Editar horário'}
                </h2>
                <button onClick={() => setEditingHourId(null)} className="text-[#9ca3af] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Dia / Período</label>
                  <input
                    value={hourForm.day_label}
                    onChange={e => setHourForm(f => ({ ...f, day_label: e.target.value }))}
                    placeholder="Ex: Seg à Sex, Sábado, Feriados..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Horário</label>
                  <input
                    value={hourForm.hours}
                    onChange={e => setHourForm(f => ({ ...f, hours: e.target.value }))}
                    placeholder="Ex: 05h às 22h, Fechado..."
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Ordem</label>
                  <input
                    type="number"
                    min="1"
                    value={hourForm.display_order}
                    onChange={e => setHourForm(f => ({ ...f, display_order: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingHourId(null)} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancelar</button>
                <button
                  onClick={saveHour}
                  disabled={savingHour || !hourForm.day_label || !hourForm.hours}
                  className="btn-green text-sm disabled:opacity-50"
                >
                  {savingHour ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação exclusão horário */}
      {deleteHourId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full">
            <p className="text-white font-black mb-1">Excluir horário?</p>
            <p className="text-[#9ca3af] text-sm mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteHourId(null)} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancelar</button>
              <button
                onClick={() => deleteHour(deleteHourId)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-bold transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
