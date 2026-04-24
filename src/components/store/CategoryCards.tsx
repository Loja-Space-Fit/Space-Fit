import Link from 'next/link'
import Image from 'next/image'
import type { Category } from '@/types'
import { Shirt, Dumbbell, Package, ArrowRight } from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  roupas:      <Shirt className="w-5 h-5" />,
  suplementos: <Dumbbell className="w-5 h-5" />,
  acessorios:  <Package className="w-5 h-5" />,
}

const categoryImages: Record<string, string> = {
  roupas:      'https://images.unsplash.com/photo-1576633587382-13ddf37b1fc1?w=600&q=80',
  suplementos: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=600&q=80',
  acessorios:  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&q=80',
}

interface Props {
  categories: Category[]
}

export default function CategoryCards({ categories }: Props) {
  if (!categories.length) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {categories.map(cat => {
        const isBundle = cat.is_bundle_category
        const imgSrc   = cat.image_url || categoryImages[cat.slug] || ''
        const href     = isBundle ? '/kits' : `/categoria/${cat.slug}`
        const label    = isBundle ? 'Ver todos' : 'Ver coleção'

        return (
          <Link
            key={cat.id}
            href={href}
            className="group relative h-56 md:h-72 rounded-2xl overflow-hidden border border-[#2a2a2a] hover:border-[#b2ea0f]/60 transition-all duration-500 hover:shadow-[0_0_30px_rgba(178,234,15,0.12)]"
          >
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt={cat.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
              />
            ) : (
              <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
                <Package className="w-16 h-16 text-[#333]" />
              </div>
            )}

            {/* Gradient overlay — more dramatic */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 group-hover:from-black/90 transition-all duration-500" />

            {/* Bottom content */}
            <div className="absolute inset-0 flex flex-col justify-end p-5">
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#b2ea0f] flex items-center justify-center text-black shadow-[0_0_14px_rgba(178,234,15,0.5)] group-hover:shadow-[0_0_22px_rgba(178,234,15,0.7)] transition-all">
                    {categoryIcons[cat.slug] || <Package className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none">{cat.name}</h3>
                    <p className="text-[#b2ea0f]/80 text-xs font-bold mt-0.5">{label}</p>
                  </div>
                </div>
                {/* Arrow that slides in on hover */}
                <div className="w-9 h-9 rounded-full border border-[#b2ea0f]/40 flex items-center justify-center translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                  <ArrowRight className="w-4 h-4 text-[#b2ea0f]" />
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
