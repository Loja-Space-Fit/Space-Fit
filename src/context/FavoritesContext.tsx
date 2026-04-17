'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext'

interface FavoritesContextValue {
  favorites: Set<string>
  toggle: (productId: string) => Promise<void>
  isFavorite: (productId: string) => boolean
  loading: boolean
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const fetchFavorites = useCallback(async () => {
    if (!user) { setFavorites(new Set()); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('favorites')
      .select('product_id')
      .eq('user_id', user.id)
    setFavorites(new Set((data ?? []).map(f => f.product_id)))
  }, [user])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  const toggle = useCallback(async (productId: string) => {
    if (!user) return
    const supabase = createClient()
    const isFav = favorites.has(productId)

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev)
      if (isFav) next.delete(productId)
      else next.add(productId)
      return next
    })

    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId)
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, product_id: productId })
    }
  }, [user, favorites])

  const isFavorite = useCallback((productId: string) => favorites.has(productId), [favorites])

  return (
    <FavoritesContext.Provider value={{ favorites, toggle, isFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider')
  return ctx
}
