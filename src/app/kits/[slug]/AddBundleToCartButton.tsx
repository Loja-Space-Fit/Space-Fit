'use client'

import { useCart } from '@/context/CartContext'
import { ShoppingCart, CheckCircle2 } from 'lucide-react'
import { formatBRL } from '@/lib/utils'
import { useState } from 'react'

interface Props {
  bundleId: string
  bundleName: string
  bundleSlug: string
  bundleImage?: string
  bundlePrice: number
  stock: number
}

export default function AddBundleToCartButton({ bundleId, bundleName, bundleSlug, bundleImage, bundlePrice, stock }: Props) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  const outOfStock = stock <= 0

  function handleAdd() {
    if (outOfStock) return
    addItem({
      product_id:    bundleId,
      product_name:  bundleName,
      product_slug:  bundleSlug,
      product_image: bundleImage,
      quantity:      1,
      unit_price:    bundlePrice,
      stock,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (outOfStock) {
    return (
      <button
        disabled
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-lg bg-[#2a2a2a] text-[#555] cursor-not-allowed"
      >
        Kit Indisponível
      </button>
    )
  }

  return (
    <button
      onClick={handleAdd}
      className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-lg transition-all ${
        added
          ? 'bg-green-500 text-white'
          : 'bg-[#b2ea0f] hover:bg-[#c8f040] text-black'
      }`}
    >
      {added ? (
        <><CheckCircle2 className="w-5 h-5" /> Adicionado!</>
      ) : (
        <><ShoppingCart className="w-5 h-5" /> Adicionar ao Carrinho — {formatBRL(bundlePrice)}</>
      )}
    </button>
  )
}
