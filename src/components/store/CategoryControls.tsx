'use client'

import { useState, useRef, useEffect, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname }                  from 'next/navigation'
import { Search, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal } from 'lucide-react'
import ProductCard from '@/components/store/ProductCard'
import type { Product } from '@/types'

const PAGE_SIZE = 12

interface Props {
  categoryId:      string
  initialProducts: Product[]
  initialCount:    number
  initialPage:     number
  initialSort:     string
  initialQ:        string
}

export default function CategoryControls({
  categoryId,
  initialProducts,
  initialCount,
  initialPage,
  initialSort,
  initialQ,
}: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef     = useRef<AbortController | null>(null)
  const [isPending, startTransition] = useTransition()

  const [products,   setProducts]   = useState<Product[]>(initialProducts)
  const [count,      setCount]      = useState(initialCount)
  const [totalPages, setTotalPages] = useState(Math.ceil(initialCount / PAGE_SIZE))
  const [page,       setPage]       = useState(initialPage)
  const [sort,       setSort]       = useState(initialSort)
  const [q,          setQ]          = useState(initialQ)
  const [inputValue, setInputValue] = useState(initialQ)
  const [loading,    setLoading]    = useState(false)
  const [sortOpen,   setSortOpen]   = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Busca produtos na API sem recarregar a página
  const fetchProducts = useCallback(async (
    newQ: string,
    newSort: string,
    newPage: number,
    pushHistory = false,
  ) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)

    try {
      const params = new URLSearchParams({ categoryId, page: String(newPage), sort: newSort })
      if (newQ) params.set('q', newQ)

      const res = await fetch(`/api/products?${params.toString()}`, { signal: abortRef.current.signal })
      if (!res.ok) throw new Error('fetch error')

      const data = await res.json()
      setProducts(data.products)
      setCount(data.count)
      setTotalPages(data.totalPages)
      setPage(newPage)

      // Atualiza URL sem criar entry no histórico (router.replace = sem history stack)
      const urlParams = new URLSearchParams()
      if (newQ)                  urlParams.set('q',    newQ)
      if (newSort !== 'featured') urlParams.set('sort', newSort)
      if (newPage > 1)           urlParams.set('page', String(newPage))

      const newUrl = urlParams.size > 0 ? `${pathname}?${urlParams.toString()}` : pathname

      startTransition(() => {
        if (pushHistory) router.push(newUrl, { scroll: false })
        else             router.replace(newUrl, { scroll: false })
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') console.error(err)
    } finally {
      setLoading(false)
    }
  }, [categoryId, pathname, router])

  // Se a URL tiver params não-padrão ao montar (ex: refresh com ?sort=price_asc),
  // busca o estado correto sem aguardar interação do usuário
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const urlQ    = (searchParams.get('q')   || '').trim()
    const urlSort = searchParams.get('sort') || 'featured'
    const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1'))
    if (urlQ !== initialQ || urlSort !== initialSort || urlPage !== initialPage) {
      fetchProducts(urlQ, urlSort, urlPage)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(value: string) {
    setInputValue(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { setQ(value); fetchProducts(value, sort, 1) }, 350)
  }

  function handleSort(newSort: string) {
    setSort(newSort)
    fetchProducts(q, newSort, 1)
  }

  function goToPage(newPage: number) {
    fetchProducts(q, sort, newPage, true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sortOptions = [
    { value: 'featured',   label: 'Destaque'    },
    { value: 'newest',     label: 'Mais novos'  },
    { value: 'price_asc',  label: 'Menor preço' },
    { value: 'price_desc', label: 'Maior preço' },
  ]

  return (
    <>
      {/* Contador dinâmico */}
      <p className="text-[#b2ea0f] text-sm font-semibold mb-4">
        {count} produto{count !== 1 ? 's' : ''} encontrado{count !== 1 ? 's' : ''}
        {q && ` para "${q}"`}
      </p>

      {/* Barra de filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        {/* Campo de busca */}
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] group-focus-within:text-[#b2ea0f] transition-colors pointer-events-none" />
          <input
            type="text"
            value={inputValue}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-10 pr-4 py-3 bg-[#111111] border border-[#2a2a2a] rounded-xl text-sm text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#b2ea0f]/50 focus:bg-[#161616] transition-all"
          />
        </div>

        {/* Ordenação — dropdown customizado */}
        <div className="relative" ref={sortRef}>
          <button
            type="button"
            onClick={() => setSortOpen(o => !o)}
            className="flex items-center gap-2 pl-3.5 pr-3 py-3 bg-[#111111] border border-[#2a2a2a] rounded-xl text-sm text-white hover:border-[#b2ea0f]/40 transition-all min-w-[160px] justify-between"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#9ca3af] shrink-0" />
              <span>{sortOptions.find(o => o.value === sort)?.label ?? 'Destaque'}</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-[#9ca3af] transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`} />
          </button>

          {sortOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50 w-full min-w-[160px] bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              {sortOptions.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { handleSort(o.value); setSortOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    sort === o.value
                      ? 'bg-[#b2ea0f]/10 text-[#b2ea0f] font-semibold'
                      : 'text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-[#b2ea0f]'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid de produtos com overlay de loading */}
      <div className="relative min-h-[200px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0a0a]/60 rounded-2xl backdrop-blur-sm">
            <div className="w-8 h-8 border-2 border-[#b2ea0f] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {products.length === 0 && !loading ? (
          <div className="py-20 text-center text-[#9ca3af]">
            <p className="text-lg">
              {q ? `Nenhum produto encontrado para "${q}".` : 'Nenhum produto disponível nesta categoria ainda.'}
            </p>
          </div>
        ) : (
          <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-opacity duration-150 ${loading ? 'opacity-30 pointer-events-none select-none' : 'opacity-100'}`}>
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-12">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111111] border border-[#2a2a2a] text-sm text-[#9ca3af] font-semibold hover:text-white hover:border-[#b2ea0f]/40 hover:bg-[#161616] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
              const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1
              const gap  = p > 1 && Math.abs(p - page) === 2 && p !== totalPages
              return (
                <span key={p} className="flex items-center gap-1">
                  {gap && <span className="text-[#9ca3af] text-sm px-1">…</span>}
                  {show && (
                    <button
                      onClick={() => goToPage(p)}
                      disabled={loading}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                        p === page
                          ? 'bg-[#b2ea0f] text-black shadow-[0_0_12px_rgba(178,234,15,0.3)] scale-105'
                          : 'bg-[#111111] border border-[#2a2a2a] text-[#9ca3af] hover:text-white hover:border-[#b2ea0f]/40 hover:bg-[#161616]'
                      }`}
                    >
                      {p}
                    </button>
                  )}
                </span>
              )
            })}
          </div>

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111111] border border-[#2a2a2a] text-sm text-[#9ca3af] font-semibold hover:text-white hover:border-[#b2ea0f]/40 hover:bg-[#161616] disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}
