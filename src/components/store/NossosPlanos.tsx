'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, MapPin, Star } from 'lucide-react'
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

type Region = {
  id: string
  value: string
  label: string
  state: string
  address: string
  display_order: number
  active: boolean
}


export default function NossosPlanos({ hideHero = false }: { hideHero?: boolean }) {
  const [activeRegion, setActiveRegion] = useState('')
  const [regions, setRegions] = useState<Region[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [hours, setHours] = useState<Hours[]>([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('academy_regions').select('*').eq('active', true).order('display_order'),
      supabase.from('academy_plans').select('*').eq('active', true).order('display_order'),
      supabase.from('academy_hours').select('*').order('display_order'),
    ]).then(([{ data: r }, { data: p }, { data: h }]) => {
      const regs = (r || []) as Region[]
      setRegions(regs)
      if (regs.length > 0) setActiveRegion(regs[0].value)
      setPlans((p || []) as Plan[])
      setHours((h || []) as Hours[])
      setLoading(false)
    })
  }, [])

  const regionPlans = plans.filter(p => p.region === activeRegion)
  const regionHours = hours.filter(h => h.region === activeRegion)
  const regionInfo  = regions.find(r => r.value === activeRegion)
  const mapSrc = regionInfo?.address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(regionInfo.address)}&output=embed&z=17&hl=pt-BR`
    : ''

  const mainPlans   = regionPlans.filter(p => !['Família', 'Casal'].includes(p.name) && !p.highlight)
  const premiumPlan = regionPlans.find(p => p.highlight)
  const familyPlans = regionPlans.filter(p => ['Família', 'Casal'].includes(p.name))

  return (
    <section id="nossos-planos" className={`bg-[#0a0a0a] py-20 ${hideHero ? '' : 'border-t border-[#1a1a1a]'}`}>
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        {!hideHero && (
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-8 h-px bg-[#b2ea0f]" />
            <span className="text-[#b2ea0f] text-sm font-bold uppercase tracking-widest">Academia</span>
            <span className="w-8 h-px bg-[#b2ea0f]" />
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white uppercase leading-tight">
            Nossos <span className="text-[#b2ea0f]">Planos</span>
          </h2>
          <p className="text-[#9ca3af] mt-3 text-lg">Escolha o plano ideal para sua evolução</p>
        </div>
        )}

        {/* Seletor de unidade */}
        <div className="flex justify-center mb-10">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-3 bg-[#111111] border-2 border-[#b2ea0f] text-white font-black text-sm rounded-xl px-6 py-3 cursor-pointer focus:outline-none transition-colors min-w-[260px] justify-between"
            >
              <span>{regions.find(r => r.value === activeRegion)?.label} – {regions.find(r => r.value === activeRegion)?.state}</span>
              <svg className={`w-4 h-4 text-[#b2ea0f] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#111111] border-2 border-[#b2ea0f]/60 rounded-xl overflow-hidden z-30 shadow-[0_8px_30px_rgba(178,234,15,0.15)]">
                {regions.map(r => (
                  <button
                    key={r.value}
                    onClick={() => { setActiveRegion(r.value); setDropdownOpen(false) }}
                    className={`w-full text-left px-6 py-3 text-sm font-bold transition-colors ${
                      activeRegion === r.value
                        ? 'bg-[#b2ea0f] text-black'
                        : 'text-white hover:bg-[#b2ea0f]/15'
                    }`}
                  >
                    {r.label} – {r.state}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-[#9ca3af] py-10">Carregando planos...</div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">

            {/* Planos principais + família/casal */}
            <div className="lg:col-span-2 space-y-6">

              {/* Grid de planos principais */}
              <div className="grid sm:grid-cols-2 gap-4">
                {mainPlans.map(plan => (
                  <div
                    key={plan.id}
                    className="bg-[#111111] border border-[#2a2a2a] hover:border-[#b2ea0f]/40 rounded-2xl p-6 transition-all"
                  >
                    <p className="text-[#b2ea0f] font-black text-xl uppercase italic mb-1">{plan.name}</p>
                    <p className="text-white text-3xl font-black">{formatBRL(plan.price)}</p>
                    {plan.price_total && plan.installments > 1 && (
                      <p className="text-[#9ca3af] text-sm mt-0.5">
                        {plan.installments}x de {formatBRL(plan.price)} = {formatBRL(plan.price_total)}
                      </p>
                    )}
                    <p className="text-[#555] text-xs mt-2 uppercase tracking-wide">{plan.period_label}</p>
                  </div>
                ))}
              </div>

              {/* Plano Premium */}
              {premiumPlan && (
                <div className="bg-gradient-to-br from-[#111111] to-[#1a1a0a] border-2 border-[#b2ea0f] rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-3 right-3">
                    <span className="bg-[#b2ea0f] text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1">
                      <Star className="w-3 h-3" fill="currentColor" /> Premium
                    </span>
                  </div>
                  <p className="text-[#b2ea0f] font-black text-xl uppercase italic mb-3">{premiumPlan.name}</p>
                  <div className="flex flex-wrap items-end gap-6 mb-4">
                    <div>
                      <p className="text-[#9ca3af] text-xs uppercase tracking-wide mb-0.5">Mensal</p>
                      <p className="text-white text-3xl font-black">{formatBRL(premiumPlan.price)}</p>
                    </div>
                    {premiumPlan.price_total && (
                      <div>
                        <p className="text-[#9ca3af] text-xs uppercase tracking-wide mb-0.5">{premiumPlan.period_label}</p>
                        <p className="text-[#b2ea0f] text-2xl font-black">{formatBRL(premiumPlan.price_total)}</p>
                      </div>
                    )}
                  </div>
                  {premiumPlan.features && (
                    <ul className="space-y-1.5">
                      {premiumPlan.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-[#d1d5db]">
                          <span className="w-4 h-4 rounded-full bg-[#b2ea0f]/20 flex items-center justify-center shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f]" />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Planos Família / Casal */}
              {familyPlans.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {familyPlans.map(plan => (
                    <div
                      key={plan.id}
                      className="bg-[#111111] border border-[#2a2a2a] hover:border-[#b2ea0f]/40 rounded-2xl p-6 transition-all"
                    >
                      <p className="text-white font-black text-lg uppercase mb-0.5">
                        Plano <span className="text-[#b2ea0f] italic">{plan.name}</span>
                      </p>
                      <p className="text-white text-3xl font-black">{formatBRL(plan.price)}</p>
                      <p className="text-[#555] text-xs mt-1 uppercase tracking-wide">{plan.period_label}</p>
                      {plan.features?.map((f, i) => (
                        <p key={i} className="text-[#9ca3af] text-xs mt-2">+ {f}</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* CTA WhatsApp */}
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 text-center">
                <p className="text-[#9ca3af] text-sm mb-3">Quer saber mais ou assinar um plano?</p>
                <a
                  href="https://wa.me/5534998853794?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20os%20planos%20da%20Space%20Fit."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-green inline-flex text-sm"
                >
                  Falar no WhatsApp
                </a>
              </div>
            </div>

            {/* Coluna direita: horários + mapa */}
            <div className="space-y-5">

              {/* Horários */}
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="bg-[#b2ea0f]/10 border-b border-[#2a2a2a] px-5 py-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#b2ea0f]" />
                  <h3 className="font-black text-white text-sm uppercase tracking-wide">Horário de Funcionamento</h3>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  {regionHours.map(h => (
                    <div key={h.id} className="px-5 py-3 flex items-center justify-between">
                      <span className="text-[#9ca3af] text-sm font-semibold">{h.day_label}</span>
                      <span className={`text-sm font-black ${h.hours === 'Fechado' ? 'text-red-400' : 'text-white'}`}>
                        {h.hours}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Localização */}
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="bg-[#b2ea0f]/10 border-b border-[#2a2a2a] px-5 py-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#b2ea0f]" />
                  <h3 className="font-black text-white text-sm uppercase tracking-wide">
                    {regionInfo?.label}
                  </h3>
                </div>
                {mapSrc && (
                  <iframe
                    src={mapSrc}
                    width="100%"
                    height="280"
                    style={{ border: 0, display: 'block' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Mapa ${regionInfo?.label}`}
                  />
                )}
                <div className="px-5 py-3 flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#b2ea0f] shrink-0 mt-0.5" />
                  <p className="text-[#9ca3af] text-xs leading-relaxed">{regionInfo?.address}</p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </section>
  )
}
