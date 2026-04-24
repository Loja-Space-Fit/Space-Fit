'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Check, GripVertical, Clock, MapPin } from 'lucide-react'
import { formatBRL } from '@/lib/utils'

type Region = {
  id: string
  value: string
  label: string
  state: string
  address: string
  display_order: number
  active: boolean
}

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

const EMPTY_PLAN: Omit<Plan, 'id'> = {
  region: '',
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

const EMPTY_REGION: Omit<Region, 'id'> = {
  value: '',
  label: '',
  state: '',
  address: '',
  display_order: 0,
  active: true,
}

export default function PlanosAdminPage() {
  const [activeRegion, setActiveRegion] = useState('')
  const [activeTab, setActiveTab] = useState<'planos' | 'horarios' | 'regioes'>('planos')
  const [regions, setRegions] = useState<Region[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [hours, setHours] = useState<Hours[]>([])
  const [loading, setLoading] = useState(true)

  // Planos
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<Omit<Plan, 'id'>>(EMPTY_PLAN)
  const [featuresText, setFeaturesText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Horários
  const [editingHourId, setEditingHourId] = useState<string | 'new' | null>(null)
  const [hourForm, setHourForm] = useState({ region: '', day_label: '', hours: '', display_order: 1 })
  const [savingHour, setSavingHour] = useState(false)
  const [deleteHourId, setDeleteHourId] = useState<string | null>(null)

  // Regiões
  const [editingRegionId, setEditingRegionId] = useState<string | 'new' | null>(null)
  const [regionForm, setRegionForm] = useState<Omit<Region, 'id'>>(EMPTY_REGION)
  const [savingRegion, setSavingRegion] = useState(false)
  const [deleteRegionId, setDeleteRegionId] = useState<string | null>(null)

  const supabase = createClient()

  async function fetchAll() {
    setLoading(true)
    const [{ data: r }, { data: p }, { data: h }] = await Promise.all([
      supabase.from('academy_regions').select('*').order('display_order'),
      supabase.from('academy_plans').select('*').order('region').order('display_order'),
      supabase.from('academy_hours').select('*').order('region').order('display_order'),
    ])
    const regs = (r || []) as Region[]
    setRegions(regs)
    if (regs.length > 0 && !activeRegion) setActiveRegion(regs[0].value)
    setPlans((p || []) as Plan[])
    setHours((h || []) as Hours[])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  // ---- PLANOS ----
  const regionPlans = plans.filter(p => p.region === activeRegion)

  function startNew() {
    setForm({ ...EMPTY_PLAN, region: activeRegion, display_order: regionPlans.length + 1 })
    setFeaturesText('')
    setEditingId('new')
  }

  function startEdit(p: Plan) {
    setForm({ region: p.region, name: p.name, period_label: p.period_label, price: p.price, price_total: p.price_total, installments: p.installments, highlight: p.highlight, features: p.features, active: p.active, display_order: p.display_order })
    setFeaturesText((p.features || []).join('\n'))
    setEditingId(p.id)
  }

  function cancel() { setEditingId(null) }

  async function save() {
    setSaving(true)
    const features = featuresText.split('\n').map(s => s.trim()).filter(Boolean)
    const payload = { ...form, features: features.length ? features : null }
    if (editingId === 'new') { await supabase.from('academy_plans').insert(payload) }
    else { await supabase.from('academy_plans').update(payload).eq('id', editingId) }
    await fetchAll()
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

  // ---- HORÁRIOS ----
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
    if (editingHourId === 'new') { await supabase.from('academy_hours').insert(hourForm) }
    else { await supabase.from('academy_hours').update(hourForm).eq('id', editingHourId) }
    await fetchAll()
    setSavingHour(false)
    setEditingHourId(null)
  }

  async function deleteHour(id: string) {
    await supabase.from('academy_hours').delete().eq('id', id)
    setHours(prev => prev.filter(h => h.id !== id))
    setDeleteHourId(null)
  }

  // ---- REGIOES ----
  function startNewRegion() {
    setRegionForm({ ...EMPTY_REGION, display_order: regions.length + 1 })
    setEditingRegionId('new')
  }

  function startEditRegion(r: Region) {
    setRegionForm({ value: r.value, label: r.label, state: r.state, address: r.address, display_order: r.display_order, active: r.active })
    setEditingRegionId(r.id)
  }

  async function saveRegion() {
    setSavingRegion(true)
    if (editingRegionId === 'new') { await supabase.from('academy_regions').insert(regionForm) }
    else { await supabase.from('academy_regions').update(regionForm).eq('id', editingRegionId) }
    await fetchAll()
    setSavingRegion(false)
    setEditingRegionId(null)
  }

  async function deleteRegion(id: string) {
    await supabase.from('academy_regions').delete().eq('id', id)
    setRegions(prev => prev.filter(r => r.id !== id))
    setDeleteRegionId(null)
  }

  async function toggleRegionActive(r: Region) {
    await supabase.from('academy_regions').update({ active: !r.active }).eq('id', r.id)
    setRegions(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x))
  }

  const currentRegionLabel = regions.find(r => r.value === activeRegion)?.label || activeRegion

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-black text-white">Planos da Academia</h1>
        {activeTab !== 'regioes' && (
          <button
            onClick={activeTab === 'planos' ? startNew : startNewHour}
            className="btn-green flex items-center gap-1.5 !px-3 !py-2 md:!px-5 md:!py-2.5 text-xs md:text-sm shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{activeTab === 'planos' ? 'Novo plano' : 'Novo horario'}</span>
          </button>
        )}
        {activeTab === 'regioes' && (
          <button onClick={startNewRegion} className="btn-green flex items-center gap-1.5 !px-3 !py-2 md:!px-5 md:!py-2.5 text-xs md:text-sm shrink-0">
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Nova regiao</span>
          </button>
        )}
      </div>

      {/* Tabs principais */}
      <div className="flex gap-1 bg-[#111111] border border-[#2a2a2a] rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab('planos')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'planos' ? 'bg-[#b2ea0f] text-black' : 'text-[#9ca3af] hover:text-white'}`}>
          Planos
        </button>
        <button onClick={() => setActiveTab('horarios')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'horarios' ? 'bg-[#b2ea0f] text-black' : 'text-[#9ca3af] hover:text-white'}`}>
          <Clock className="w-3.5 h-3.5" /> Horarios
        </button>
        <button onClick={() => setActiveTab('regioes')} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'regioes' ? 'bg-[#b2ea0f] text-black' : 'text-[#9ca3af] hover:text-white'}`}>
          <MapPin className="w-3.5 h-3.5" /> Regioes
        </button>
      </div>

      {/* Seletor de unidade (so nas abas Planos e Horarios) */}
      {activeTab !== 'regioes' && (
        <div className="flex flex-wrap gap-2">
          {regions.map(r => (
            <button
              key={r.value}
              onClick={() => { setActiveRegion(r.value); cancel() }}
              className={`px-5 py-2 rounded-xl font-bold text-sm border-2 transition-all ${
                activeRegion === r.value
                  ? 'bg-[#b2ea0f] text-black border-[#b2ea0f]'
                  : 'bg-transparent text-[#9ca3af] border-[#2a2a2a] hover:border-[#b2ea0f]/50 hover:text-white'
              }`}
            >
              {r.label} <span className="opacity-60 font-normal">- {r.state}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-[#9ca3af] py-10 text-center">Carregando...</div>
      ) : activeTab === 'planos' ? (

        /* ---- ABA PLANOS ---- */
        <div className="space-y-3">
          {regionPlans.map(plan => (
            <div key={plan.id} className={`bg-[#111111] border rounded-xl p-3 sm:p-4 flex items-center gap-3 ${plan.highlight ? 'border-[#b2ea0f]/40' : 'border-[#2a2a2a]'}`}>
              <GripVertical className="w-4 h-4 text-[#555] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`font-black text-sm ${plan.highlight ? 'text-[#b2ea0f]' : 'text-white'}`}>{plan.name}</span>
                  {plan.highlight && <span className="text-[10px] bg-[#b2ea0f]/20 text-[#b2ea0f] px-1.5 py-0.5 rounded-full font-bold">Premium</span>}
                  {!plan.active && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold">Inativo</span>}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-0.5">
                  <span className="text-white font-black text-sm">{formatBRL(plan.price)}</span>
                  <span className="text-[#555] text-xs">{plan.period_label}</span>
                  {plan.price_total && (
                    <span className="text-[#9ca3af] text-xs">{plan.installments}x = {formatBRL(plan.price_total)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggleActive(plan)} title={plan.active ? 'Desativar' : 'Ativar'} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${plan.active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#2a2a2a] text-[#555] hover:bg-[#333]'}`}>
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => startEdit(plan)} className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-[#9ca3af] hover:text-white hover:bg-[#333] transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteId(plan.id)} className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-[#9ca3af] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {regionPlans.length === 0 && (
            <div className="text-center text-[#555] py-12 border-2 border-dashed border-[#2a2a2a] rounded-2xl">
              Nenhum plano para <strong className="text-[#9ca3af]">{currentRegionLabel}</strong>.<br />
              <button onClick={startNew} className="text-[#b2ea0f] hover:underline mt-2 text-sm">Criar o primeiro</button>
            </div>
          )}
        </div>

      ) : activeTab === 'horarios' ? (

        /* ---- ABA HORARIOS ---- */
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
              Nenhum horario para <strong className="text-[#9ca3af]">{currentRegionLabel}</strong>.<br />
              <button onClick={startNewHour} className="text-[#b2ea0f] hover:underline mt-2 text-sm">Adicionar horario</button>
            </div>
          )}
        </div>

      ) : (

        /* ---- ABA REGIOES ---- */
        <div className="space-y-3">
          {regions.map(r => (
            <div key={r.id} className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4">
              <MapPin className="w-4 h-4 text-[#b2ea0f] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-black text-sm">{r.label}</span>
                  <span className="text-[#555] text-xs font-mono">- {r.state}</span>
                  {!r.active && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">Inativa</span>}
                </div>
                {r.address && <p className="text-[#9ca3af] text-xs mt-0.5 truncate">{r.address}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleRegionActive(r)} title={r.active ? 'Desativar' : 'Ativar'} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${r.active ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#2a2a2a] text-[#555] hover:bg-[#333]'}`}>
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => startEditRegion(r)} className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-[#9ca3af] hover:text-white hover:bg-[#333] transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteRegionId(r.id)} className="w-8 h-8 rounded-lg bg-[#2a2a2a] flex items-center justify-center text-[#9ca3af] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {regions.length === 0 && (
            <div className="text-center text-[#555] py-12 border-2 border-dashed border-[#2a2a2a] rounded-2xl">
              Nenhuma regiao cadastrada.<br />
              <button onClick={startNewRegion} className="text-[#b2ea0f] hover:underline mt-2 text-sm">Criar a primeira</button>
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL PLANO ===== */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">{editingId === 'new' ? 'Novo plano' : 'Editar plano'}</h2>
                <button onClick={cancel} className="text-[#9ca3af] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Nome do plano</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Mensal, Anual, Premium..." className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                </div>
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Preco mensal (R$)</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                </div>
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Total do periodo (R$)</label>
                  <input type="number" step="0.01" value={form.price_total ?? ''} onChange={e => setForm(f => ({ ...f, price_total: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="Opcional" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                </div>
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Parcelas</label>
                  <input type="number" min="1" value={form.installments} onChange={e => setForm(f => ({ ...f, installments: parseInt(e.target.value) || 1 }))} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                </div>
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Ordem</label>
                  <input type="number" min="1" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 1 }))} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Descricao do periodo</label>
                  <input value={form.period_label} onChange={e => setForm(f => ({ ...f, period_label: e.target.value }))} placeholder="Ex: sem fidelidade, 12x sem juros..." className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Beneficios (um por linha)</label>
                  <textarea rows={4} value={featuresText} onChange={e => setFeaturesText(e.target.value)} placeholder={"Acesso ilimitado\nAvaliacao fisica\n..."} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50 resize-none" />
                </div>
                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.highlight} onChange={e => setForm(f => ({ ...f, highlight: e.target.checked }))} className="accent-[#b2ea0f] w-4 h-4" />
                    <span className="text-sm text-white font-semibold">Plano em destaque (Premium)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-[#b2ea0f] w-4 h-4" />
                    <span className="text-sm text-white font-semibold">Ativo</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={cancel} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancelar</button>
                <button onClick={save} disabled={saving || !form.name} className="btn-green text-sm disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar plano'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL HORARIO ===== */}
      {editingHourId !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">{editingHourId === 'new' ? 'Novo horario' : 'Editar horario'}</h2>
                <button onClick={() => setEditingHourId(null)} className="text-[#9ca3af] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Dia / Periodo</label>
                  <input value={hourForm.day_label} onChange={e => setHourForm(f => ({ ...f, day_label: e.target.value }))} placeholder="Ex: Seg a Sex, Sabado, Feriados..." className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                </div>
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Horario</label>
                  <input value={hourForm.hours} onChange={e => setHourForm(f => ({ ...f, hours: e.target.value }))} placeholder="Ex: 05h as 22h, Fechado..." className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                </div>
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Ordem</label>
                  <input type="number" min="1" value={hourForm.display_order} onChange={e => setHourForm(f => ({ ...f, display_order: parseInt(e.target.value) || 1 }))} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingHourId(null)} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancelar</button>
                <button onClick={saveHour} disabled={savingHour || !hourForm.day_label || !hourForm.hours} className="btn-green text-sm disabled:opacity-50">{savingHour ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL REGIAO ===== */}
      {editingRegionId !== null && (
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white">{editingRegionId === 'new' ? 'Nova regiao' : 'Editar regiao'}</h2>
                <button onClick={() => setEditingRegionId(null)} className="text-[#9ca3af] hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Nome da unidade</label>
                    <input value={regionForm.label} onChange={e => setRegionForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Conceicao das Alagoas" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                  </div>
                  <div>
                    <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Estado (UF)</label>
                    <input value={regionForm.state} onChange={e => setRegionForm(f => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="MG" maxLength={2} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50 uppercase" />
                  </div>
                  <div>
                    <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Slug (ID unico)</label>
                    <input value={regionForm.value} onChange={e => setRegionForm(f => ({ ...f, value: e.target.value.toLowerCase().replace(/\s/g, '_') }))} placeholder="ex: conceicao" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Endereco completo</label>
                  <input value={regionForm.address} onChange={e => setRegionForm(f => ({ ...f, address: e.target.value }))} placeholder="Ex: R. Verissimo, 500 - Centro, Conceicao das Alagoas - MG, 38120-000" className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                  <p className="text-[#555] text-xs mt-1">Este endereco sera usado no Google Maps da pagina de planos.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#9ca3af] mb-1 block font-semibold uppercase">Ordem</label>
                    <input type="number" min="1" value={regionForm.display_order} onChange={e => setRegionForm(f => ({ ...f, display_order: parseInt(e.target.value) || 1 }))} className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b2ea0f]/50" />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={regionForm.active} onChange={e => setRegionForm(f => ({ ...f, active: e.target.checked }))} className="accent-[#b2ea0f] w-4 h-4" />
                      <span className="text-sm text-white font-semibold">Ativa</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingRegionId(null)} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancelar</button>
                <button onClick={saveRegion} disabled={savingRegion || !regionForm.label || !regionForm.value || !regionForm.state} className="btn-green text-sm disabled:opacity-50">{savingRegion ? 'Salvando...' : 'Salvar regiao'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAIS CONFIRMACAO EXCLUSAO ===== */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full">
            <p className="text-white font-black mb-1">Excluir plano?</p>
            <p className="text-[#9ca3af] text-sm mb-5">Esta acao nao pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancelar</button>
              <button onClick={() => deletePlan(deleteId)} className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-bold transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
      {deleteHourId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full">
            <p className="text-white font-black mb-1">Excluir horario?</p>
            <p className="text-[#9ca3af] text-sm mb-5">Esta acao nao pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteHourId(null)} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancelar</button>
              <button onClick={() => deleteHour(deleteHourId)} className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-bold transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
      {deleteRegionId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full">
            <p className="text-white font-black mb-1">Excluir regiao?</p>
            <p className="text-[#9ca3af] text-sm mb-5">Os planos e horarios vinculados a esta regiao continuarao no banco. Esta acao nao pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteRegionId(null)} className="px-4 py-2 text-sm text-[#9ca3af] hover:text-white">Cancelar</button>
              <button onClick={() => deleteRegion(deleteRegionId)} className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-xl font-bold transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
