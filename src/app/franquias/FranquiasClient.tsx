'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Building2, ChevronRight, ChevronLeft, ImageOff, MessageCircle, Quote } from 'lucide-react'

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

  useEffect(() => {
    setSlideIndex(0)
    setResetKey(0)
  }, [activeRegion])

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setSlideIndex(i => (i + 1) % images.length)
    }, 4000)
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

  const prevIdx = (slideIndex - 1 + images.length) % images.length
  const nextIdx = (slideIndex + 1) % images.length

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

            {/* Sidebar */}
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
              <div className="mt-6 hidden lg:block space-y-3">
                <Link href="/planos" className="flex items-center gap-2 text-xs text-[#9ca3af] hover:text-[#b2ea0f] transition-colors font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f]" />
                  Ver planos desta unidade
                </Link>
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP || '5534998853794'}?text=${encodeURIComponent('Olá! Tenho interesse em ser um franqueado da Space Fit Academia. Pode me passar mais informações?')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-[#b2ea0f] hover:text-[#c8f040] transition-colors font-bold"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Ser um franqueado
                </a>
              </div>
            </aside>

            {/* Conteúdo principal */}
            <div className="flex-1 min-w-0 space-y-10">

              {/* Cabeçalho da região */}
              <div className="flex items-start justify-between flex-wrap gap-3">
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
              </div>

              {/* ── HISTÓRIA ── */}
              <div className="relative rounded-3xl overflow-hidden border border-[#2a2a2a]"
                style={{ background: 'linear-gradient(135deg, #141414 0%, #0f1a00 60%, #111111 100%)' }}>
                {/* Glow verde no canto */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#b2ea0f]/10 rounded-full blur-3xl pointer-events-none" />
                {/* Linha verde topo */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#b2ea0f] via-[#b2ea0f]/40 to-transparent" />

                <div className="relative p-8 md:p-10">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 bg-[#b2ea0f]/15 border border-[#b2ea0f]/30 rounded-full px-4 py-1.5 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f]" />
                    <span className="text-[#b2ea0f] text-xs font-black uppercase tracking-[0.2em]">Nossa História</span>
                  </div>

                  {/* Aspas decorativas */}
                  <Quote className="w-10 h-10 text-[#b2ea0f]/20 mb-3 -ml-1" />

                  {franchise?.history ? (
                    <p className="text-[#e5e7eb] text-[19px] leading-[1.9] whitespace-pre-wrap">
                      {franchise.history}
                    </p>
                  ) : (
                    <p className="text-[#555] text-base italic">Conteúdo em breve.</p>
                  )}
                </div>
              </div>

              {/* ── GALERIA ── */}
              <div>
                {/* Título seção */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-8 h-px bg-[#b2ea0f]" />
                  <span className="text-[#b2ea0f] text-xs font-black uppercase tracking-[0.2em]">Galeria de Fotos</span>
                  <span className="flex-1 h-px bg-[#1a1a1a]" />
                  {images.length > 1 && (
                    <span className="text-[#555] text-xs font-semibold">{slideIndex + 1} / {images.length}</span>
                  )}
                </div>

                {images.length > 0 ? (
                  <div className="relative">
                    {/* Stage — imagem central grande + vizinhas menores */}
                    <div className="flex items-center justify-center gap-3 md:gap-4 overflow-hidden px-2">

                      {/* Imagem anterior (peek) */}
                      {images.length > 1 && (
                        <button
                          onClick={goPrev}
                          aria-label="Foto anterior"
                          className="shrink-0 hidden sm:block w-[18%] aspect-video relative rounded-xl overflow-hidden border border-[#2a2a2a] opacity-40 hover:opacity-60 transition-all duration-300 cursor-pointer"
                        >
                          <Image
                            src={images[prevIdx]}
                            alt="Foto anterior"
                            fill
                            className="object-cover scale-105"
                            sizes="20vw"
                          />
                          <div className="absolute inset-0 bg-black/40" />
                        </button>
                      )}

                      {/* Imagem principal */}
                      <div className="flex-1 relative aspect-video rounded-2xl overflow-hidden border-2 border-[#b2ea0f]/40 shadow-[0_0_40px_rgba(178,234,15,0.15)]">
                        <Image
                          key={`${activeRegion}-${slideIndex}`}
                          src={images[slideIndex]}
                          alt={`${region?.label} — foto ${slideIndex + 1}`}
                          fill
                          className="object-cover transition-opacity duration-500"
                          sizes="(max-width: 640px) 100vw, 60vw"
                          priority
                        />
                        {/* Gradiente inferior */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                        {/* Setas sobre a imagem principal (mobile) */}
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={goPrev}
                              aria-label="Foto anterior"
                              className="sm:hidden absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 text-white border border-white/10 z-10"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={goNext}
                              aria-label="Próxima foto"
                              className="sm:hidden absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 text-white border border-white/10 z-10"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Próxima imagem (peek) */}
                      {images.length > 1 && (
                        <button
                          onClick={goNext}
                          aria-label="Próxima foto"
                          className="shrink-0 hidden sm:block w-[18%] aspect-video relative rounded-xl overflow-hidden border border-[#2a2a2a] opacity-40 hover:opacity-60 transition-all duration-300 cursor-pointer"
                        >
                          <Image
                            src={images[nextIdx]}
                            alt="Próxima foto"
                            fill
                            className="object-cover scale-105"
                            sizes="20vw"
                          />
                          <div className="absolute inset-0 bg-black/40" />
                        </button>
                      )}
                    </div>

                    {/* Pontos indicadores */}
                    {images.length > 1 && (
                      <div className="flex items-center justify-center gap-1.5 mt-4">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => { setSlideIndex(i); setResetKey(k => k + 1) }}
                            aria-label={`Ir para foto ${i + 1}`}
                            className={`rounded-full transition-all duration-300 ${
                              i === slideIndex
                                ? 'w-6 h-2 bg-[#b2ea0f]'
                                : 'w-2 h-2 bg-[#2a2a2a] hover:bg-[#444]'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 rounded-2xl border border-dashed border-[#2a2a2a] text-[#555]">
                    <ImageOff className="w-8 h-8 mb-2" />
                    <p className="text-xs italic">Nenhuma imagem cadastrada para esta unidade.</p>
                  </div>
                )}
              </div>

              {/* CTA Franqueado */}
              <div className="relative bg-gradient-to-br from-[#b2ea0f]/15 to-[#b2ea0f]/5 border border-[#b2ea0f]/30 rounded-2xl p-7 overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#b2ea0f] rounded-l-full" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div>
                    <p className="text-[#b2ea0f] text-xs font-black uppercase tracking-[0.2em] mb-1">Oportunidade de negócio</p>
                    <h3 className="text-white text-xl font-black uppercase leading-tight">
                      Quero ser um <span className="text-[#b2ea0f]">franqueado</span>
                    </h3>
                    <p className="text-[#9ca3af] text-sm mt-2 max-w-sm">
                      Faça parte da rede Space Fit e leve a academia para a sua cidade.
                      Entre em contato e saiba como funciona.
                    </p>
                  </div>
                  <a
                    href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP || '5534998853794'}?text=${encodeURIComponent('Olá! Tenho interesse em ser um franqueado da Space Fit Academia. Pode me passar mais informações?')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-2.5 px-6 py-3 rounded-xl bg-[#b2ea0f] hover:bg-[#c8f040] text-black font-black text-sm transition-all shadow-[0_0_20px_rgba(178,234,15,0.3)] hover:shadow-[0_0_28px_rgba(178,234,15,0.5)]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Falar no WhatsApp
                  </a>
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
