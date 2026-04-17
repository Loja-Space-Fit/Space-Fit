'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Product } from '@/types'
import { formatBRL, getDiscount } from '@/lib/utils'
import { useFavorites } from '@/context/FavoritesContext'
import { useAuth } from '@/context/AuthContext'

export default function ProductCard({ product }: { product: Product }) {
  const discount = product.compare_price ? getDiscount(product.price, product.compare_price) : 0
  const mainImage = product.images?.[0]
  const { toggle, isFavorite } = useFavorites()
  const { user } = useAuth()
  const router = useRouter()
  const fav = isFavorite(product.id)

  function handleFavorite(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { router.push('/login'); return }
    toggle(product.id)
  }

  return (
    <div className="product-card group flex flex-col">
      {/* Imagem */}
      <Link href={`/produto/${product.slug}`} className="block relative aspect-square overflow-hidden bg-[#1a1a1a] rounded-t-xl">
        {mainImage ? (
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#9ca3af] text-sm">
            Sem imagem
          </div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-[#b2ea0f] text-black text-xs font-black px-2 py-1 rounded-md">
            -{discount}%
          </span>
        )}
        {product.stock === 0 && (
          <>
            <div className="absolute inset-0 bg-black/40" />
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
              Produto Esgotado
            </span>
          </>
        )}
        {/* Botão favoritar */}
        <button
          onClick={handleFavorite}
          className={`group/heart absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md ${
            fav
              ? 'bg-[#b2ea0f] scale-110'
              : 'bg-black/60 hover:bg-[#b2ea0f] hover:scale-110'
          }`}
        >
          {fav
            ? <Heart className="w-4 h-4 text-black fill-black" />
            : <Heart className="w-4 h-4 text-[#b2ea0f] group-hover/heart:text-black" />
          }
        </button>
      </Link>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <Link href={`/produto/${product.slug}`}>
          <h3 className="text-sm font-semibold text-white hover:text-[#b2ea0f] transition-colors line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Preço */}
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="text-lg font-black text-[#b2ea0f]">{formatBRL(product.price)}</span>
          {product.compare_price && product.compare_price > product.price && (
            <span className="text-sm text-[#9ca3af] line-through">{formatBRL(product.compare_price)}</span>
          )}
        </div>

        {/* Botão */}
        {product.stock > 0 ? (
          <Link
            href={`/produto/${product.slug}`}
            className="w-full py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all bg-[#b2ea0f] text-black hover:bg-[#c8f040]"
          >
            Comprar
          </Link>
        ) : (
          <button
            disabled
            className="w-full py-2 text-sm font-bold bg-[#2a2a2a] text-[#9ca3af] rounded-lg cursor-not-allowed"
          >
            Produto Esgotado
          </button>
        )}
      </div>
    </div>
  )
}
