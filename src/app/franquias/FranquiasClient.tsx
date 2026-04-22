'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Building2, ChevronRight, ChevronLeft, ImageOff } from 'lucide-react'

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
  const [slideIndex, setSlideIndex] = useState(0)
  const [resetKey, setResetKey] = useState(0)

  const franchise = franchises.find(f => f.region_value === activeRegion)
  const region = regions.find(r => r.value === activeRegion)
  const images = franchise?.images ?? []

  const mapSrc = region?.address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(region.address)}&output=embed&z=17&hl=pt-BR`
    : ''

  // Reinicia slide ao trocar de região
  useEffect(() => {
    setSlideIndex(0)
    setResetKey(0)
  }, [activeRegion])

  // Avança automaticamente a cada 3 segundos; reinicia timer ao resetKey mudar
  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setSlideIndex(i => (i + 1) % images.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [images.length, resetKey, activeRegion])

  const goNext = useCallback(() => {
    setSlideIndex(i => (i + 1) % images.length)
    setResetKey(k => k + 1)
  }, [images.length])

  const goPrev = useCallback(() => {
    setSlideIndex(i => (i - 1 + images.length) % images.length)
    setResetKey(k => k + 1)
  }, [images.length])

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

            {/* Sidebar: lista de cidades */}
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

            {/* Conteúdo principal */}
            <div className="flex-1 min-w-0 space-y-8">

              {/* Cabeçalho da região */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-5 h-5 text-[#b2ea0f]" />
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase">
                    {region?.label}
                    <span className="text-[#b2ea0f] ml-2">— {region?.state}</span>
                  </h2>
                </div>
                {region?.address && (
                  <p className="text-[#9ca3af] text-sm flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#b2ea0f] shrink-0" />
                    {region.address}
                  </p>
                )}
              </div>

              {/* História (esquerda) + Slideshow (direita) */}
              <div className="grid lg:grid-cols-2 gap-6 items-stretch">

                {/* História — destaque */}
                <div className="relative bg-gradient-to-br from-[#141414] to-[#111111] border border-[#2a2a2a] rounded-2xl p-7 flex flex-col overflow-hidden">
                  {/* Barra de destaque verde à esquerda */}
                  <div className="absolute left-0 top-6 bottom-6 w-1 bg-[#b2ea0f] rounded-r-full" />

                  <div className="flex items-center gap-2 mb-5">
                    <span className="w-5 h-px bg-[#b2ea0f]" />
                    <h3 className="text-[#b2ea0f] font-black text-xs uppercase tracking-[0.2em]">
                      Nossa História
                    </h3>
                  </div>

                  {franchise?.history ? (
                    <p className="text-[#e5e7eb] text-[19px] leading-[1.85] whitespace-pre-wrap flex-1">
                      {franchise.history}
                    </p>
                  ) : (
                    <p className="text-[#555] text-sm italic flex-1">Conteúdo em breve.</p>
                  )}
                </div>

                {/* Slideshow de imagens */}
                <div className="relative bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden aspect-video lg:aspect-auto min-h-[260px]">
                  {images.length > 0 ? (
                    <>
                      {/* Imagem atual */}
                      <Image
                        key={`${activeRegion}-${slideIndex}`}
                        src={images[slideIndex]}
                        alt={`${region?.label} — foto ${slideIndex + 1}`}
                        fill
                        className="object-cover transition-opacity duration-500"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />

                      {/* Overlay escuro suave nas bordas */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                      {/* Setas de navegação */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={goPrev}
                            aria-label="Foto anterior"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 transition-all hover:scale-110 z-10"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            onClick={goNext}
                            aria-label="Próxima foto"
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 transition-all hover:scale-110 z-10"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>

                          {/* Indicadores (pontos) */}
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                            {images.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => { setSlideIndex(i); setResetKey(k => k + 1) }}
                                aria-label={`Ir para foto ${i + 1}`}
                                className={`rounded-full transition-all ${
                                  i === slideIndex
                                    ? 'w-5 h-2 bg-[#b2ea0f]'
                                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                                }`}
                              />
                            ))}
                          </div>

                          {/* Contador */}
                          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
                            {slideIndex + 1} / {images.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[#555]">
                      <ImageOff className="w-8 h-8 mb-2" />
                      <p className="text-xs italic">Nenhuma imagem cadastrada.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mapa */}
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
