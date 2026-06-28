'use client'

import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import type { Product } from '@/types'
import { ShoppingCart, Check } from 'lucide-react'

interface Props {
  product: Product
  selectedSize?: string
  selectedFlavor?: string
  quantity?: number
  compact?: boolean
  sizeStock?: number
}

export default function AddToCartButton({ product, selectedSize, selectedFlavor, quantity = 1, compact = false, sizeStock }: Props) {
  const { addItem, openCart } = useCart()
  const [added, setAdded] = useState(false)

  function handleAdd() {
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      product_image: product.images?.[0],
      size: selectedSize,
      flavor: selectedFlavor,
      quantity,
      unit_price: product.price,
      stock: sizeStock ?? product.stock,
    })
    setAdded(true)
    openCart()
    setTimeout(() => setAdded(false), 2000)
  }

  if (compact) {
    return (
      <button
        onClick={handleAdd}
        className={`w-full py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
          added
            ? 'bg-[#8fbb00] text-white'
            : 'bg-[#b2ea0f] text-black hover:bg-[#c8f040]'
        }`}
      >
        {added ? (
          <><Check className="w-3.5 h-3.5" /> Adicionado!</>
        ) : (
          <><ShoppingCart className="w-3.5 h-3.5" /> Comprar</>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleAdd}
      className={`btn-green w-full py-4 text-base rounded-xl gap-2 ${added ? '!bg-[#8fbb00]' : ''}`}
    >
      {added ? (
        <><Check className="w-5 h-5" /> Adicionado ao Carrinho!</>
      ) : (
        <><ShoppingCart className="w-5 h-5" /> Adicionar ao Carrinho</>
      )}
    </button>
  )
}
