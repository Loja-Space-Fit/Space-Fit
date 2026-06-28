'use client'

import { useState } from 'react'
import type { Product, ProductVariation } from '@/types'
import AddToCartButton from './AddToCartButton'
import { Minus, Plus, Package } from 'lucide-react'

export default function ProductActionsClient({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize]     = useState<string | undefined>(undefined)
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>(undefined)
  const [quantity, setQuantity]             = useState(1)

  const hasSizes   = (product.sizes?.length ?? 0) > 0
  const hasFlavors = (product.flavors?.length ?? 0) > 0
  const isCombo    = hasSizes && hasFlavors
  const isSizeOnly = hasSizes && !hasFlavors
  const isFlavorOnly = hasFlavors && !hasSizes

  const sizeStock: Record<string, number>   = product.size_stock   ?? {}
  const flavorStock: Record<string, number> = product.flavor_stock ?? {}
  const hasSizeStockData   = Object.keys(sizeStock).length   > 0
  const hasFlavorStockData = Object.keys(flavorStock).length > 0

  const variations: ProductVariation[] = product.variations ?? []

  // Retorna o estoque de uma variação específica (combo)
  function getVariationStock(size: string, flavor: string): number {
    const v = variations.find(v => v.size === size && v.flavor === flavor)
    return v?.stock ?? 0
  }

  // Disponibilidade de um tamanho considerando o sabor selecionado
  function isSizeAvailable(size: string): boolean {
    if (isCombo) {
      if (selectedFlavor) return getVariationStock(size, selectedFlavor) > 0
      // Sem sabor selecionado: disponível se existe alguma variação com estoque
      return variations.some(v => v.size === size && v.stock > 0)
    }
    return hasSizeStockData ? (sizeStock[size] ?? 0) > 0 : product.stock > 0
  }

  // Disponibilidade de um sabor considerando o tamanho selecionado
  function isFlavorAvailable(flavor: string): boolean {
    if (isCombo) {
      if (selectedSize) return getVariationStock(selectedSize, flavor) > 0
      return variations.some(v => v.flavor === flavor && v.stock > 0)
    }
    return hasFlavorStockData ? (flavorStock[flavor] ?? 0) > 0 : product.stock > 0
  }

  // Estoque efetivo para a seleção atual
  const effectiveStock: number | null = (() => {
    if (isCombo) {
      if (selectedSize != null && selectedFlavor != null) {
        return getVariationStock(selectedSize, selectedFlavor)
      }
      return null // seleção incompleta
    }
    if (isSizeOnly) {
      if (selectedSize != null) {
        return hasSizeStockData ? (sizeStock[selectedSize] ?? 0) : product.stock
      }
      return null
    }
    if (isFlavorOnly) {
      if (selectedFlavor != null) {
        return hasFlavorStockData ? (flavorStock[selectedFlavor] ?? 0) : product.stock
      }
      return null
    }
    return product.stock
  })()

  const currentStock   = effectiveStock ?? 0
  const selectionDone  = isCombo ? (selectedSize != null && selectedFlavor != null) : (isSizeOnly ? selectedSize != null : isFlavorOnly ? selectedFlavor != null : true)
  const outOfStock     = selectionDone && currentStock === 0

  // Label descritivo do esgotamento
  function outOfStockLabel(): string {
    if (isCombo)    return 'Esgotado para esta combinação'
    if (isSizeOnly) return 'Esgotado neste tamanho'
    if (isFlavorOnly) return 'Esgotado neste sabor'
    return 'Produto Esgotado'
  }

  return (
    <div className="space-y-4">

      {/* ── Seletor de tamanho ── */}
      {hasSizes && (
        <div>
          <p className="text-sm font-semibold text-white mb-2">
            Tamanho: {selectedSize && <span className="text-[#b2ea0f]">{selectedSize}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(size => {
              const available = isSizeAvailable(size)
              return (
                <button
                  key={size}
                  onClick={() => { setSelectedSize(size); setQuantity(1) }}
                  disabled={!available}
                  className={`w-14 h-10 rounded-lg text-sm font-bold border-2 transition-all relative ${
                    selectedSize === size
                      ? 'border-[#b2ea0f] bg-[#b2ea0f] text-black'
                      : !available
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

      {/* ── Seletor de sabor ── */}
      {hasFlavors && (
        <div>
          <p className="text-sm font-semibold text-white mb-2">
            Sabor: {selectedFlavor && <span className="text-[#b2ea0f]">{selectedFlavor}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.flavors.map(flavor => {
              const available = isFlavorAvailable(flavor)
              return (
                <button
                  key={flavor}
                  onClick={() => { setSelectedFlavor(flavor); setQuantity(1) }}
                  disabled={!available}
                  className={`px-4 h-10 rounded-lg text-sm font-bold border-2 transition-all ${
                    selectedFlavor === flavor
                      ? 'border-[#b2ea0f] bg-[#b2ea0f] text-black'
                      : !available
                      ? 'border-[#2a2a2a] text-[#4b5563] cursor-not-allowed line-through'
                      : 'border-[#2a2a2a] text-white hover:border-[#b2ea0f]'
                  }`}
                >
                  {flavor}
                </button>
              )
            })}
          </div>
          {!selectedFlavor && (
            <p className="text-xs text-[#9ca3af] mt-1">Selecione um sabor</p>
          )}
        </div>
      )}

      {/* ── Indicador de estoque ── */}
      {selectionDone && (
        <div className="flex items-center gap-2">
          <Package className={`w-4 h-4 ${outOfStock ? 'text-red-400' : 'text-[#b2ea0f]'}`} />
          <span className={`text-sm font-semibold ${outOfStock ? 'text-red-400' : 'text-[#b2ea0f]'}`}>
            {outOfStock
              ? outOfStockLabel()
              : `${currentStock} unidade${currentStock !== 1 ? 's' : ''} disponível${currentStock !== 1 ? 'is' : ''}`
            }
          </span>
        </div>
      )}

      {/* ── Seletor de quantidade ── */}
      {selectionDone && !outOfStock && currentStock > 0 && (
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
              onClick={() => setQuantity(q => Math.min(currentStock, q + 1))}
              className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-white hover:bg-[#b2ea0f] hover:text-black hover:border-[#b2ea0f] transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Botão de compra ── */}
      {(() => {
        // Produto simples esgotado
        if (!hasSizes && !hasFlavors && product.stock === 0) {
          return (
            <button disabled className="w-full py-3 rounded-xl text-base font-bold bg-[#2a2a2a] text-[#9ca3af] cursor-not-allowed">
              Produto Esgotado
            </button>
          )
        }
        // Seleção feita e esgotada
        if (selectionDone && outOfStock) {
          return (
            <button disabled className="w-full py-3 rounded-xl text-base font-bold bg-[#2a2a2a] text-[#9ca3af] cursor-not-allowed">
              {outOfStockLabel()}
            </button>
          )
        }
        // Aguardando seleção
        const needsSelection = (hasSizes && !selectedSize) || (hasFlavors && !selectedFlavor)
        return (
          <div className={needsSelection ? 'opacity-60 pointer-events-none' : ''}>
            <AddToCartButton
              product={product}
              selectedSize={selectedSize}
              selectedFlavor={selectedFlavor}
              quantity={quantity}
              sizeStock={effectiveStock ?? product.stock}
            />
          </div>
        )
      })()}
    </div>
  )
}
