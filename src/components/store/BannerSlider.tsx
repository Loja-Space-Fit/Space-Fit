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
      <div className="relative h-72 md:h-[500px] bg-gradient-to-br from-[#111111] via-[#0a0a0a] to-[#1a2a1a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">
            SPACE <span className="text-[#b2ea0f]">FIT</span>
          </h1>
          <p className="text-[#9ca3af] mt-2">Discipline. Energy. Results.</p>
          <Link href="/categoria/roupas" className="btn-green mt-6 inline-flex">
            Ver Produtos
          </Link>
        </div>
      </div>
    )
  }

  const banner = banners[current]

  return (
    <div className="relative h-72 md:h-[500px] overflow-hidden bg-[#111111]">
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image
            src={b.image_url}
            alt={b.title || 'Banner Space Fit'}
            fill
            priority={i === 0}
            className="object-cover"
          />
          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        </div>
      ))}

      {/* Texto do banner */}
      <div className="relative z-10 h-full flex items-center px-8 md:px-16 max-w-2xl">
        <div>
          {banner.title && (
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none mb-3">
              {banner.title.split(' ').map((word, i) => (
                <span key={i}>
                  {i % 3 === 1 ? <span className="text-[#b2ea0f]">{word}</span> : word}
                  {' '}
                </span>
              ))}
            </h1>
          )}
          {banner.subtitle && (
            <p className="text-[#d1d5db] text-base md:text-lg mb-6">{banner.subtitle}</p>
          )}
          {banner.link ? (
            <Link href={banner.link} className="btn-green">
              Comprar Agora
            </Link>
          ) : (
            <Link href="/categoria/roupas" className="btn-green">
              Ver Produtos
            </Link>
          )}
        </div>
      </div>

      {/* Navegação */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/50 hover:bg-[#b2ea0f] text-white rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/50 hover:bg-[#b2ea0f] text-white rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-[#b2ea0f] w-6' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
