import Link from 'next/link'
import Image from 'next/image'
import type { Category, Bundle } from '@/types'
import { Shirt, Dumbbell, Package } from 'lucide-react'

const categoryIcons: Record<string, React.ReactNode> = {
  roupas:      <Shirt className="w-8 h-8" />,
  suplementos: <Dumbbell className="w-8 h-8" />,
  acessorios:  <Package className="w-8 h-8" />,
}

const categoryImages: Record<string, string> = {
  roupas:      'https://images.unsplash.com/photo-1576633587382-13ddf37b1fc1?w=600&q=80',
  suplementos: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=600&q=80',
  acessorios:  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&q=80',
}

interface Props {
  categories: Category[]
  bundles?: Bundle[]
}

export default function CategoryCards({ categories, bundles = [] }: Props) {
  if (!categories.length && !bundles.length) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {categories.map(cat => {
        const imgSrc = cat.image_url || categoryImages[cat.slug] || ''
        return (
          <Link
            key={cat.id}
            href={`/categoria/${cat.slug}`}
            className="group relative h-48 md:h-56 rounded-2xl overflow-hidden border border-[#2a2a2a] hover:border-[#b2ea0f] transition-all"
          >
            {imgSrc && (
              <Image
                src={imgSrc}
                alt={cat.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#b2ea0f] flex items-center justify-center text-black">
                  {categoryIcons[cat.slug] || <Package className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">{cat.name}</h3>
                  <p className="text-xs text-[#b2ea0f] font-semibold">Ver coleção →</p>
                </div>
              </div>
            </div>
          </Link>
        )
      })}

      {bundles.map(bundle => {
        const imgSrc = bundle.image_url || ''
        return (
          <Link
            key={bundle.id}
            href="/kits"
            className="group relative h-48 md:h-56 rounded-2xl overflow-hidden border border-[#2a2a2a] hover:border-[#b2ea0f] transition-all"
          >
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt={bundle.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 bg-[#1a1a1a] flex items-center justify-center">
                <Package className="w-16 h-16 text-[#333]" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#b2ea0f] flex items-center justify-center text-black">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">{bundle.name}</h3>
                  <p className="text-xs text-[#b2ea0f] font-semibold">Ver todos →</p>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
