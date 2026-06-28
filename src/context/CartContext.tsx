'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CartItem, Coupon } from '@/types'

const CART_TTL_MS = 3 * 60 * 60 * 1000 // 3 horas

interface CartState {
  items: CartItem[]
  coupon: Coupon | null
  couponCode: string
  isOpen: boolean
  addedAt: number | null // timestamp de quando o primeiro item foi adicionado
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { product_id: string; size?: string; flavor?: string } }
  | { type: 'UPDATE_QTY'; payload: { product_id: string; size?: string; flavor?: string; quantity: number } }
  | { type: 'SET_COUPON'; payload: { coupon: Coupon; code: string } }
  | { type: 'REMOVE_COUPON' }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART'; payload?: boolean }
  | { type: 'RESTORE_ADDED_AT'; payload: number }

// Chave única por item: produto + tamanho + sabor
function itemKey(product_id: string, size?: string, flavor?: string): string {
  return `${product_id}-${size || ''}-${flavor || ''}`
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = itemKey(action.payload.product_id, action.payload.size, action.payload.flavor)
      const existing = state.items.findIndex(
        i => itemKey(i.product_id, i.size, i.flavor) === key
      )
      if (existing >= 0) {
        const items = [...state.items]
        items[existing] = {
          ...items[existing],
          quantity: items[existing].quantity + action.payload.quantity,
        }
        return { ...state, items }
      }
      return {
        ...state,
        items: [...state.items, action.payload],
        addedAt: state.addedAt ?? Date.now(),
      }
    }
    case 'REMOVE_ITEM': {
      const key = itemKey(action.payload.product_id, action.payload.size, action.payload.flavor)
      return { ...state, items: state.items.filter(i => itemKey(i.product_id, i.size, i.flavor) !== key) }
    }
    case 'UPDATE_QTY': {
      const key = itemKey(action.payload.product_id, action.payload.size, action.payload.flavor)
      if (action.payload.quantity <= 0) {
        return { ...state, items: state.items.filter(i => itemKey(i.product_id, i.size, i.flavor) !== key) }
      }
      const items = state.items.map(i =>
        itemKey(i.product_id, i.size, i.flavor) === key
          ? { ...i, quantity: action.payload.quantity }
          : i
      )
      return { ...state, items }
    }
    case 'SET_COUPON':
      return { ...state, coupon: action.payload.coupon, couponCode: action.payload.code }
    case 'REMOVE_COUPON':
      return { ...state, coupon: null, couponCode: '' }
    case 'CLEAR_CART':
      return { ...state, items: [], coupon: null, couponCode: '', addedAt: null }
    case 'TOGGLE_CART':
      return { ...state, isOpen: action.payload !== undefined ? action.payload : !state.isOpen }
    case 'RESTORE_ADDED_AT':
      return { ...state, addedAt: action.payload }
    default:
      return state
  }
}

interface CartContextValue extends CartState {
  addItem: (item: CartItem) => void
  removeItem: (product_id: string, size?: string, flavor?: string) => void
  updateQty: (product_id: string, size: string | undefined, flavor: string | undefined, quantity: number) => void
  setCoupon: (coupon: Coupon, code: string) => void
  removeCoupon: () => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
  totalItems: number
  subtotal: number
  discount: number
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    coupon: null,
    couponCode: '',
    isOpen: false,
    addedAt: null,
  })
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Zerar carrinho ao fazer logout
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'CLEAR_CART' })
        try { localStorage.removeItem('spacefit_cart') } catch { /* ignora */ }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Timer de 3 horas para esvaziar o carrinho automaticamente
  useEffect(() => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
    if (state.items.length === 0 || !state.addedAt) return

    const elapsed = Date.now() - state.addedAt
    const remaining = CART_TTL_MS - elapsed

    if (remaining <= 0) {
      dispatch({ type: 'CLEAR_CART' })
      try { localStorage.removeItem('spacefit_cart') } catch { /* ignora */ }
      return
    }

    clearTimerRef.current = setTimeout(() => {
      dispatch({ type: 'CLEAR_CART' })
      try { localStorage.removeItem('spacefit_cart') } catch { /* ignora */ }
    }, remaining)

    return () => { if (clearTimerRef.current) clearTimeout(clearTimerRef.current) }
  }, [state.items.length, state.addedAt])

  // Persistir carrinho no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('spacefit_cart')
      if (saved) {
        const parsed = JSON.parse(saved)
        const addedAt: number | null = parsed.addedAt ?? null
        // Se já passou 3h, não restaurar
        if (addedAt && Date.now() - addedAt >= CART_TTL_MS) {
          localStorage.removeItem('spacefit_cart')
          return
        }
        parsed.items?.forEach((item: CartItem) =>
          dispatch({ type: 'ADD_ITEM', payload: item })
        )
        // Restaura o addedAt original via ADD_ITEM já define, mas precisamos sobrescrever
        if (addedAt) {
          dispatch({ type: 'RESTORE_ADDED_AT', payload: addedAt })
        }
      }
    } catch { /* ignora erro de parse */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('spacefit_cart', JSON.stringify({ items: state.items, addedAt: state.addedAt }))
    } catch { /* ignora */ }
  }, [state.items, state.addedAt])

  const subtotal = state.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  let discount = 0
  if (state.coupon) {
    discount = state.coupon.type === 'percent'
      ? (subtotal * state.coupon.value) / 100
      : Math.min(state.coupon.value, subtotal)
  }
  const total = Math.max(0, subtotal - discount)
  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0)

  const addItem    = useCallback((item: CartItem) => dispatch({ type: 'ADD_ITEM', payload: item }), [])
  const removeItem = useCallback((product_id: string, size?: string, flavor?: string) => dispatch({ type: 'REMOVE_ITEM', payload: { product_id, size, flavor } }), [])
  const updateQty  = useCallback((product_id: string, size: string | undefined, flavor: string | undefined, quantity: number) => dispatch({ type: 'UPDATE_QTY', payload: { product_id, size, flavor, quantity } }), [])
  const setCoupon  = useCallback((coupon: Coupon, code: string) => dispatch({ type: 'SET_COUPON', payload: { coupon, code } }), [])
  const removeCoupon = useCallback(() => dispatch({ type: 'REMOVE_COUPON' }), [])
  const clearCart  = useCallback(() => dispatch({ type: 'CLEAR_CART' }), [])
  const openCart   = useCallback(() => dispatch({ type: 'TOGGLE_CART', payload: true }), [])
  const closeCart  = useCallback(() => dispatch({ type: 'TOGGLE_CART', payload: false }), [])

  return (
    <CartContext.Provider value={{
      ...state,
      addItem, removeItem, updateQty,
      setCoupon, removeCoupon, clearCart,
      openCart, closeCart,
      totalItems, subtotal, discount, total,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider')
  return ctx
}
