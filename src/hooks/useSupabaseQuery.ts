'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Hook genérico para buscar dados do Supabase nas páginas admin.
 * Substitui o padrão repetido de loading + useCallback + useEffect.
 *
 * @example
 * const { data: produtos, loading, refetch } = useSupabaseQuery(
 *   async (supabase) => {
 *     const { data } = await supabase.from('products').select('*')
 *     return data ?? []
 *   }
 * )
 */
export function useSupabaseQuery<T>(
  fetchFn: (supabase: SupabaseClient) => Promise<T>,
  deps: unknown[] = []
): { data: T | null; loading: boolean; refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const result = await fetchFn(supabase)
      setData(result)
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, refetch }
}
