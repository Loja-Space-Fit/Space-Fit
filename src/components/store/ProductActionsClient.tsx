'use client'

import { useState } from 'react'
import type { Product } from '@/types'
import AddToCartButton from './AddToCartButton'
import { Minus, Plus } from 'lucide-react'

export default function ProductActionsClient({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined)
  const [quantity, setQuantity] = useState(1)

  const hasSizes = product.sizes?.length > 0

  return (
    <div className="space-y-4">
      {/* Seletor de tamanho */}
      {hasSizes && product.stock > 0 && (
        <div>
          <p className="text-sm font-semibold text-white mb-2">
            Tamanho: {selectedSize && <span className="text-[#b2ea0f]">{selectedSize}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`w-12 h-10 rounded-lg text-sm font-bold border-2 transition-all ${
                  selectedSize === size
                    ? 'border-[#b2ea0f] bg-[#b2ea0f] text-black'
                    : 'border-[#2a2a2a] text-white hover:border-[#b2ea0f]'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          {hasSizes && !selectedSize && (
            <p className="text-xs text-[#9ca3af] mt-1">Selecione um tamanho</p>
          )}
        </div>
      )}

      {/* Quantidade */}
      {product.stock > 0 && (
      <div>
        <p className="text-sm font-semibold text-white mb-2">Quantidade</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-white hover:bg-[#b2ea0f] hover:text-black hover:border-[#b2ea0f] transition-all"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-lg font-black text-white w-8 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
            className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-white hover:bg-[#b2ea0f] hover:text-black hover:border-[#b2ea0f] transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}

      {/* Botão adicionar */}
      {product.stock > 0 ? (
        <div className={hasSizes && !selectedSize ? 'opacity-60 pointer-events-none' : ''}>
          <AddToCartButton product={product} selectedSize={selectedSize} quantity={quantity} />
        </div>
      ) : (
        <button disabled className="w-full py-3 rounded-xl text-base font-bold bg-[#2a2a2a] text-[#9ca3af] cursor-not-allowed">
          Produto Esgotado
        </button>
      )}
    </div>
  )
}
