'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Building2, ChevronRight, ImageOff } from 'lucide-react'

type Region = {
  id: string
  value: string
  label: string
  state: string
  address: string
}

type FranchiseContent = {
  region_value: string
  history: string
  images: string[]
}

interface Props {
  regions: Region[]
  franchises: FranchiseContent[]
}

export default function FranquiasClient({ regions, franchises }: Props) {
  const [activeRegion, setActiveRegion] = useState(regions[0]?.value ?? '')

  const franchise = franchises.find(f => f.region_value === activeRegion)
  const region = regions.find(r => r.value === activeRegion)

  const mapSrc = region?.address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(region.address)}&output=embed&z=17&hl=pt-BR`
    : ''

  return (
    <main className="min-h-screen bg-[#0a0a0a]">

      {/* Hero */}
      <div className="relative overflow-hidden bg-[#0a0a0a] border-b border-[#1a1a1a]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#b2ea0f]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#b2ea0f]/60 to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#b2ea0f]/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 py-16 text-center relative z-10">
          <div className="inline-flex items-center gap-2.5 bg-[#b2ea0f]/10 border border-[#b2ea0f]/30 rounded-full px-5 py-2 mb-6">
            <Building2 className="w-4 h-4 text-[#b2ea0f]" />
            <span className="text-[#b2ea0f] text-sm font-black uppercase tracking-widest">Space Fit Academia</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white uppercase leading-none mb-4">
            Nossas <span className="text-[#b2ea0f]">Franquias</span>
          </h1>

          <p className="text-[#9ca3af] text-lg max-w-xl mx-auto">
            Presença em múltiplas cidades, sempre com a mesma excelência.
            Conheça a história de cada unidade.
          </p>

          <div className="flex items-center justify-center gap-3 mt-8">
            <span className="w-16 h-px bg-gradient-to-r from-transparent to-[#b2ea0f]/50" />
            <span className="w-2 h-2 rounded-full bg-[#b2ea0f]" />
            <span className="w-16 h-px bg-gradient-to-l from-transparent to-[#b2ea0f]/50" />
          </div>
        </div>
      </div>

      {regions.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <Building2 className="w-12 h-12 text-[#2a2a2a] mx-auto mb-4" />
          <p className="text-[#9ca3af] text-lg">Nenhuma franquia cadastrada ainda.</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Sidebar: city list */}
            <aside className="lg:w-64 shrink-0">
              <p className="text-[#9ca3af] text-xs font-bold uppercase tracking-widest mb-3 px-1">Selecionar unidade</p>
              <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {regions.map(r => {
                  const isActive = r.value === activeRegion
                  return (
                    <button
                      key={r.value}
                      onClick={() => setActiveRegion(r.value)}
                      className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-left transition-all border ${
                        isActive
                          ? 'bg-[#b2ea0f]/15 border-[#b2ea0f]/40 text-[#b2ea0f]'
                          : 'bg-[#111111] border-[#2a2a2a] text-[#9ca3af] hover:text-white hover:border-[#3a3a3a]'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#b2ea0f]' : 'text-[#555]'}`} />
                      <div className="text-left">
                        <div className="leading-tight">{r.label}</div>
                        <div className={`text-xs font-semibold ${isActive ? 'text-[#b2ea0f]/70' : 'text-[#555]'}`}>{r.state}</div>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 ml-auto hidden lg:block" />}
                    </button>
                  )
                })}
              </div>

              {/* Link to plans */}
              <div className="mt-6 hidden lg:block">
                <Link
                  href="/planos"
                  className="flex items-center gap-2 text-xs text-[#9ca3af] hover:text-[#b2ea0f] transition-colors font-semibold"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f]" />
                  Ver planos desta unidade
                </Link>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-8">

              {/* Region header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-5 h-5 text-[#b2ea0f]" />
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase">
                    {region?.label}
                    <span className="text-[#b2ea0f] ml-2">– {region?.state}</span>
                  </h2>
                </div>
                {region?.address && (
                  <p className="text-[#9ca3af] text-sm flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#b2ea0f] shrink-0" />
                    {region.address}
                  </p>
                )}
              </div>

              {/* History */}
              {franchise?.history ? (
                <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
                  <h3 className="text-[#b2ea0f] font-black text-sm uppercase tracking-wider mb-4">
                    Nossa História
                  </h3>
                  <div className="text-[#d1d5db] leading-relaxed whitespace-pre-wrap text-sm">
                    {franchise.history}
                  </div>
                </div>
              ) : (
                <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
                  <h3 className="text-[#b2ea0f] font-black text-sm uppercase tracking-wider mb-3">
                    Nossa História
                  </h3>
                  <p className="text-[#555] text-sm italic">Conteúdo em breve.</p>
                </div>
              )}

              {/* Images gallery */}
              {franchise?.images && franchise.images.length > 0 ? (
                <div>
                  <h3 className="text-[#b2ea0f] font-black text-sm uppercase tracking-wider mb-4">
                    Galeria de Fotos
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {franchise.images.map((url, i) => (
                      <div
                        key={i}
                        className="relative aspect-video rounded-xl overflow-hidden bg-[#111111] border border-[#2a2a2a] group"
                      >
                        <Image
                          src={url}
                          alt={`${region?.label} foto ${i + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-8 text-center">
                  <ImageOff className="w-8 h-8 text-[#333] mx-auto mb-2" />
                  <p className="text-[#555] text-sm italic">Nenhuma imagem cadastrada para esta unidade.</p>
                </div>
              )}

              {/* Map */}
              {mapSrc && (
                <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                  <div className="bg-[#b2ea0f]/10 border-b border-[#2a2a2a] px-5 py-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#b2ea0f]" />
                    <h3 className="font-black text-white text-sm uppercase tracking-wide">
                      Localização — {region?.label}
                    </h3>
                  </div>
                  <iframe
                    src={mapSrc}
                    width="100%"
                    height="340"
                    style={{ border: 0, display: 'block' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Mapa ${region?.label}`}
                  />
                  <div className="px-5 py-3 flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#b2ea0f] shrink-0 mt-0.5" />
                    <p className="text-[#9ca3af] text-xs leading-relaxed">{region?.address}</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </main>
  )
}
