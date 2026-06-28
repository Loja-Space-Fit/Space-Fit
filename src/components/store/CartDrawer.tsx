'use client'

import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { X, Minus, Plus, Trash2, ShoppingBag, Clock } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { formatBRL } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const CART_TTL_MS = 3 * 60 * 60 * 1000

function useCartTimer(addedAt: number | null, hasItems: boolean) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!hasItems || !addedAt) { setRemaining(null); return }

    function update() {
      const left = CART_TTL_MS - (Date.now() - addedAt!)
      setRemaining(left > 0 ? left : 0)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [addedAt, hasItems])

  return remaining
}

function formatTimer(ms: number) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

export default function CartDrawer() {
  const {
    isOpen, closeCart, items, removeItem, updateQty,
    subtotal, total, addedAt,
  } = useCart()
  const { user } = useAuth()
  const router = useRouter()
  const remaining = useCartTimer(addedAt, items.length > 0)

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={closeCart}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-[#111111] border-l border-[#2a2a2a] flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#b2ea0f]" />
            <h2 className="font-bold text-white text-lg">Carrinho</h2>
          </div>
          <button
            onClick={closeCart}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1a1a1a] text-[#9ca3af] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Banner de urgência */}
          {items.length > 0 && remaining !== null && (
            <div className="bg-[#1a1a1a] border border-[#b2ea0f]/30 rounded-xl p-3 flex gap-3 items-start">
              <Clock className="w-4 h-4 text-[#b2ea0f] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-white">
                  Não deixe seus itens escaparem · <span className="text-[#b2ea0f]">{formatTimer(remaining)}</span>
                </p>
                <p className="text-xs text-[#9ca3af] mt-0.5">
                  Corra! Itens podem esgotar. Finalize a compra e garanta agora.
                </p>
              </div>
            </div>
          )}
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-[#9ca3af]">
              <ShoppingBag className="w-16 h-16 opacity-20" />
              <div>
                <p className="font-semibold text-white">Carrinho vazio</p>
                <p className="text-sm mt-1">Adicione produtos para continuar</p>
              </div>
              <button
                onClick={closeCart}
                className="btn-green mt-2"
              >
                Ver Produtos
              </button>
            </div>
          ) : (
            items.map(item => {
              const key = `${item.product_id}-${item.size || ''}-${item.flavor || ''}`
              return (
                <div key={key} className="flex gap-3 p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
                  {/* Imagem */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#2a2a2a] shrink-0">
                    {item.product_image ? (
                      <Image
                        src={item.product_image}
                        alt={item.product_name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-[#9ca3af]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.product_name}</p>
                    {(item.size || item.flavor) && (
                      <p className="text-xs text-[#9ca3af] mt-0.5">
                        {[item.flavor, item.size].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="text-sm font-bold text-[#b2ea0f] mt-1">
                      {formatBRL(item.unit_price)}
                    </p>

                    {/* Quantidade */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQty(item.product_id, item.size, item.flavor, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-[#2a2a2a] text-white hover:bg-[#b2ea0f] hover:text-black transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.product_id, item.size, item.flavor, item.quantity + 1)}
                        disabled={item.stock != null && item.quantity >= item.stock}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-[#2a2a2a] text-white hover:bg-[#b2ea0f] hover:text-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[#2a2a2a] disabled:hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.product_id, item.size, item.flavor)}
                        className="ml-auto w-6 h-6 flex items-center justify-center rounded-md text-red-400 hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer do carrinho */}
        {items.length > 0 && (
          <div className="p-4 border-t border-[#2a2a2a] space-y-4">
            {/* Totais */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-[#9ca3af]">
                <span>Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-white text-lg pt-1 border-t border-[#2a2a2a]">
                <span>Total</span>
                <span className="text-[#b2ea0f]">{formatBRL(total)}</span>
              </div>
            </div>

            {/* Botões */}
            <button
              onClick={closeCart}
              className="w-full py-3 rounded-xl border border-[#2a2a2a] text-[#9ca3af] text-sm font-semibold hover:border-[#b2ea0f]/50 hover:text-white transition-colors"
            >
              Continuar Comprando
            </button>

            {user ? (
              <Link
                href="/checkout"
                onClick={closeCart}
                className="btn-green w-full text-center block py-4 text-base rounded-xl"
              >
                Finalizar Compra
              </Link>
            ) : (
              <button
                onClick={() => { closeCart(); router.push('/login?redirect=/checkout&message=login-required') }}
                className="btn-green w-full text-center block py-4 text-base rounded-xl"
              >
                Entrar para Finalizar
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
