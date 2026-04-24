'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Banner } from '@/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function BannerSlider({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent(c => (c + 1) % banners.length), [banners.length])
  const prev = () => setCurrent(c => (c - 1 + banners.length) % banners.length)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [banners.length, next])

  if (!banners.length) {
    return (
      <div className="relative h-[380px] md:h-[560px] bg-gradient-to-br from-[#111111] via-[#0a0a0a] to-[#0f1a00] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(178,234,15,0.08)_0%,_transparent_70%)]" />
        <div className="text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#b2ea0f]/10 border border-[#b2ea0f]/30 rounded-full px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f] animate-pulse" />
            <span className="text-[#b2ea0f] text-xs font-black uppercase tracking-widest">Space Fit Academia</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">
            SPACE <span className="text-[#b2ea0f]">FIT</span>
          </h1>
          <p className="text-[#9ca3af] mt-3 text-lg">Discipline. Energy. Results.</p>
          <Link href="/categoria/roupas" className="btn-green mt-8 inline-flex shadow-[0_0_24px_rgba(178,234,15,0.4)]">
            Ver Produtos <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const banner = banners[current]

  return (
    <div className="relative h-[380px] md:h-[560px] overflow-hidden bg-[#0a0a0a]">
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image
            src={b.image_url}
            alt={b.title || 'Banner Space Fit'}
            fill
            priority={i === 0}
            className="object-cover"
          />
          {/* Overlay dramático */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      ))}

      {/* Linha verde esquerda */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#b2ea0f] to-transparent z-10" />

      {/* Texto do banner */}
      <div className="relative z-10 h-full flex items-center px-6 md:px-16 max-w-3xl">
        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#b2ea0f]/15 border border-[#b2ea0f]/40 rounded-full px-3 py-1 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f]" />
            <span className="text-[#b2ea0f] text-[11px] font-black uppercase tracking-[0.2em]">Space Fit</span>
          </div>
          {banner.title && (
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-none mb-4">
              {banner.title.split(' ').map((word, i) => (
                <span key={i}>
                  {(banner.highlighted_words || []).includes(i)
                    ? <span style={{ color: banner.highlight_color || '#b2ea0f' }}>{word}</span>
                    : word}
                  {' '}
                </span>
              ))}
            </h1>
          )}
          {banner.subtitle && (
            <p className="text-[#d1d5db] text-sm md:text-lg mb-7 max-w-sm leading-relaxed">{banner.subtitle}</p>
          )}
          <Link
            href={banner.link || '/categoria/roupas'}
            className="btn-green shadow-[0_0_24px_rgba(178,234,15,0.35)] hover:shadow-[0_0_32px_rgba(178,234,15,0.5)] flex items-center gap-2 w-fit"
          >
            {banner.button_text || 'Comprar Agora'} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Navegação */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/60 hover:bg-[#b2ea0f] text-white hover:text-black rounded-full flex items-center justify-center transition-all border border-white/10 hover:border-[#b2ea0f]"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/60 hover:bg-[#b2ea0f] text-white hover:text-black rounded-full flex items-center justify-center transition-all border border-white/10 hover:border-[#b2ea0f]"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-5 left-8 md:left-16 z-20 flex items-center gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${i === current ? 'bg-[#b2ea0f] w-6 h-2' : 'bg-white/30 w-2 h-2 hover:bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
