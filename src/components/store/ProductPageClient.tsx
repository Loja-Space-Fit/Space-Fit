'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Product } from '@/types'

export default function ProductPageClient({ product }: { product: Product }) {
  const images = product.images?.length ? product.images : []
  const [selected, setSelected] = useState(0)

  if (!images.length) {
    return (
      <div className="aspect-square rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[#9ca3af]">
        Sem imagem
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Imagem principal */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a]">
        <Image
          src={images[selected]}
          alt={product.name}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === selected ? 'border-[#b2ea0f]' : 'border-[#2a2a2a] opacity-60 hover:opacity-100'
              }`}
            >
              <Image src={img} alt={`Imagem ${i + 1}`} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
