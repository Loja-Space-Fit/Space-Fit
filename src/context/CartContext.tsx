'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CartItem, Coupon } from '@/types'
import { formatBRL } from '@/lib/utils'

interface CartState {
  items: CartItem[]
  coupon: Coupon | null
  couponCode: string
  isOpen: boolean
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: { product_id: string; size?: string } }
  | { type: 'UPDATE_QTY'; payload: { product_id: string; size?: string; quantity: number } }
  | { type: 'SET_COUPON'; payload: { coupon: Coupon; code: string } }
  | { type: 'REMOVE_COUPON' }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_CART'; payload?: boolean }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = `${action.payload.product_id}-${action.payload.size || ''}`
      const existing = state.items.findIndex(
        i => `${i.product_id}-${i.size || ''}` === key
      )
      if (existing >= 0) {
        const items = [...state.items]
        items[existing] = {
          ...items[existing],
          quantity: items[existing].quantity + action.payload.quantity,
        }
        return { ...state, items }
      }
      return { ...state, items: [...state.items, action.payload] }
    }
    case 'REMOVE_ITEM': {
      const key = `${action.payload.product_id}-${action.payload.size || ''}`
      return { ...state, items: state.items.filter(i => `${i.product_id}-${i.size || ''}` !== key) }
    }
    case 'UPDATE_QTY': {
      const key = `${action.payload.product_id}-${action.payload.size || ''}`
      if (action.payload.quantity <= 0) {
        return { ...state, items: state.items.filter(i => `${i.product_id}-${i.size || ''}` !== key) }
      }
      const items = state.items.map(i =>
        `${i.product_id}-${i.size || ''}` === key
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
      return { ...state, items: [], coupon: null, couponCode: '' }
    case 'TOGGLE_CART':
      return { ...state, isOpen: action.payload !== undefined ? action.payload : !state.isOpen }
    default:
      return state
  }
}

interface CartContextValue extends CartState {
  addItem: (item: CartItem) => void
  removeItem: (product_id: string, size?: string) => void
  updateQty: (product_id: string, size: string | undefined, quantity: number) => void
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
  })

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

  // Persistir carrinho no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('spacefit_cart')
      if (saved) {
        const parsed = JSON.parse(saved)
        parsed.items?.forEach((item: CartItem) =>
          dispatch({ type: 'ADD_ITEM', payload: item })
        )
      }
    } catch { /* ignora erro de parse */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('spacefit_cart', JSON.stringify({ items: state.items }))
    } catch { /* ignora */ }
  }, [state.items])

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
  const removeItem = useCallback((product_id: string, size?: string) => dispatch({ type: 'REMOVE_ITEM', payload: { product_id, size } }), [])
  const updateQty  = useCallback((product_id: string, size: string | undefined, quantity: number) => dispatch({ type: 'UPDATE_QTY', payload: { product_id, size, quantity } }), [])
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
