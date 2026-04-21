'use client'

import { useState, useEffect } from 'react'
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

const REGIONS = [
  { value: 'conceicao', label: 'Conceição das Alagoas', state: 'MG', mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15002.123!2d-47.0344!3d-19.9167!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94af1a2e2e2e2e2d%3A0x0!2sConcei%C3%A7%C3%A3o%20das%20Alagoas%2C%20MG!5e0!3m2!1spt-BR!2sbr!4v1700000000000!5m2!1spt-BR!2sbr' },
  { value: 'guaira',    label: 'Guaíra',                state: 'SP', mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15002.123!2d-48.3167!3d-20.3167!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94bdf0000000000%3A0x0!2sGua%C3%ADra%2C%20SP!5e0!3m2!1spt-BR!2sbr!4v1700000000000!5m2!1spt-BR!2sbr' },
]

export default function NossosPlanos() {
  const [activeRegion, setActiveRegion] = useState('conceicao')
  const [plans, setPlans] = useState<Plan[]>([])
  const [hours, setHours] = useState<Hours[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('academy_plans').select('*').eq('active', true).order('display_order'),
      supabase.from('academy_hours').select('*').order('display_order'),
    ]).then(([{ data: p }, { data: h }]) => {
      setPlans((p || []) as Plan[])
      setHours((h || []) as Hours[])
      setLoading(false)
    })
  }, [])

  const regionPlans = plans.filter(p => p.region === activeRegion)
  const regionHours = hours.filter(h => h.region === activeRegion)
  const regionInfo  = REGIONS.find(r => r.value === activeRegion)!

  const mainPlans   = regionPlans.filter(p => !['Família', 'Casal'].includes(p.name) && !p.highlight)
  const premiumPlan = regionPlans.find(p => p.highlight)
  const familyPlans = regionPlans.filter(p => ['Família', 'Casal'].includes(p.name))

  return (
    <section id="nossos-planos" className="bg-[#0a0a0a] border-t border-[#1a1a1a] py-20">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
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

        {/* Seletor de unidade */}
        <div className="flex justify-center gap-3 mb-10">
          {REGIONS.map(r => (
            <button
              key={r.value}
              onClick={() => setActiveRegion(r.value)}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                activeRegion === r.value
                  ? 'bg-[#b2ea0f] text-black border-[#b2ea0f]'
                  : 'bg-transparent text-[#9ca3af] border-[#2a2a2a] hover:border-[#b2ea0f]/50 hover:text-white'
              }`}
            >
              {r.label} <span className="opacity-60 font-normal ml-1">– {r.state}</span>
            </button>
          ))}
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
                    {regionInfo.label}
                  </h3>
                </div>
                <iframe
                  src={regionInfo.mapSrc}
                  width="100%"
                  height="280"
                  style={{ border: 0, display: 'block' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Mapa ${regionInfo.label}`}
                />
              </div>

            </div>
          </div>
        )}
      </div>
    </section>
  )
}
