'use client'

import { useState } from 'react'
import type { Product } from '@/types'
import AddToCartButton from './AddToCartButton'
import { Minus, Plus, Package } from 'lucide-react'

export default function ProductActionsClient({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined)
  const [quantity, setQuantity] = useState(1)

  const hasSizes = product.sizes?.length > 0
  const sizeStock: Record<string, number> = product.size_stock ?? {}

  // Estoque efetivo para o contexto atual
  const stockForSize: number | null = hasSizes
    ? (selectedSize != null ? (sizeStock[selectedSize] ?? 0) : null)
    : product.stock

  const effectiveStock = stockForSize ?? 0
  const sizeOutOfStock = hasSizes && selectedSize != null && effectiveStock === 0

  return (
    <div className="space-y-4">
      {/* Seletor de tamanho */}
      {hasSizes && (
        <div>
          <p className="text-sm font-semibold text-white mb-2">
            Tamanho: {selectedSize && <span className="text-[#b2ea0f]">{selectedSize}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(size => {
              const sizeQty = sizeStock[size] ?? 0
              const isUnavailable = sizeQty === 0
              return (
                <button
                  key={size}
                  onClick={() => { setSelectedSize(size); setQuantity(1) }}
                  disabled={isUnavailable}
                  className={`w-14 h-10 rounded-lg text-sm font-bold border-2 transition-all relative ${
                    selectedSize === size
                      ? 'border-[#b2ea0f] bg-[#b2ea0f] text-black'
                      : isUnavailable
                      ? 'border-[#2a2a2a] text-[#4b5563] cursor-not-allowed line-through'
                      : 'border-[#2a2a2a] text-white hover:border-[#b2ea0f]'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
          {!selectedSize && (
            <p className="text-xs text-[#9ca3af] mt-1">Selecione um tamanho</p>
          )}
        </div>
      )}

      {/* Estoque do tamanho selecionado (ou produto esgotado sem tamanho) */}
      {hasSizes && selectedSize != null && (
        <div className="flex items-center gap-2">
          <Package className={`w-4 h-4 ${sizeOutOfStock ? 'text-red-400' : 'text-[#b2ea0f]'}`} />
          <span className={`text-sm font-semibold ${sizeOutOfStock ? 'text-red-400' : 'text-[#b2ea0f]'}`}>
            {sizeOutOfStock ? 'Esgotado neste tamanho' : `${effectiveStock} unidade${effectiveStock !== 1 ? 's' : ''} disponível${effectiveStock !== 1 ? 'is' : ''}`}
          </span>
        </div>
      )}

      {/* Quantidade — só mostra quando há estoque disponível */}
      {!sizeOutOfStock && (!hasSizes ? product.stock > 0 : selectedSize != null && effectiveStock > 0) && (
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
              onClick={() => setQuantity(q => Math.min(effectiveStock, q + 1))}
              className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-white hover:bg-[#b2ea0f] hover:text-black hover:border-[#b2ea0f] transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Botão adicionar */}
      {(() => {
        // Produto sem tamanho esgotado
        if (!hasSizes && product.stock === 0) {
          return (
            <button disabled className="w-full py-3 rounded-xl text-base font-bold bg-[#2a2a2a] text-[#9ca3af] cursor-not-allowed">
              Produto Esgotado
            </button>
          )
        }
        // Produto com tamanho esgotado no tamanho selecionado
        if (hasSizes && selectedSize != null && sizeOutOfStock) {
          return (
            <button disabled className="w-full py-3 rounded-xl text-base font-bold bg-[#2a2a2a] text-[#9ca3af] cursor-not-allowed">
              Esgotado neste tamanho
            </button>
          )
        }
        // Aguardando seleção de tamanho ou produto normal disponível
        const disabled = hasSizes && !selectedSize
        return (
          <div className={disabled ? 'opacity-60 pointer-events-none' : ''}>
            <AddToCartButton
              product={product}
              selectedSize={selectedSize}
              quantity={quantity}
              sizeStock={stockForSize ?? product.stock}
            />
          </div>
        )
      })()}
    </div>
  )
}
