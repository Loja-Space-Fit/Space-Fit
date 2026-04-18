'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, Check, X, Trash2, RefreshCcw, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReviewAdmin {
  id: string
  product_id: string
  customer_name: string
  rating: number
  comment: string | null
  approved: boolean
  created_at: string
  products: { name: string; slug: string } | null
}

const LABELS: Record<number, string> = {
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Muito bom',
}

const FILTROS = [
  { value: 'all',      label: 'Todas' },
  { value: 'pending',  label: 'Pendentes' },
  { value: 'approved', label: 'Aprovadas' },
]

export default function PaginaAvaliacoesAdmin() {
  const supabase = createClient()

  const [lista, setLista]         = useState<ReviewAdmin[]>([])
  const [loading, setLoading]     = useState(true)
  const [filtro, setFiltro]       = useState('pending')
  const [busca, setBusca]         = useState('')
  const [atualizando, setAtualizando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('reviews')
        .select('*, products(name, slug)')
        .order('created_at', { ascending: false })

      if (filtro === 'pending')  query = query.eq('approved', false)
      if (filtro === 'approved') query = query.eq('approved', true)

      const { data, error } = await query
      if (error) throw error
      setLista((data as ReviewAdmin[]) ?? [])
    } catch {
      toast.error('Erro ao carregar avaliações.')
    } finally {
      setLoading(false)
    }
  }, [supabase, filtro])

  useEffect(() => { carregar() }, [carregar])

  const listaFiltrada = lista.filter(r => {
    if (!busca.trim()) return true
    const b = busca.toLowerCase()
    return (
      r.customer_name.toLowerCase().includes(b) ||
      r.products?.name.toLowerCase().includes(b) ||
      r.comment?.toLowerCase().includes(b)
    )
  })

  async function aprovar(id: string) {
    setAtualizando(id)
    const { error } = await supabase.from('reviews').update({ approved: true }).eq('id', id)
    if (error) { toast.error('Erro ao aprovar.'); setAtualizando(null); return }
    toast.success('Avaliação aprovada!')
    setLista(prev => prev.map(r => r.id === id ? { ...r, approved: true } : r))
    setAtualizando(null)
  }

  async function reprovar(id: string) {
    setAtualizando(id)
    const { error } = await supabase.from('reviews').update({ approved: false }).eq('id', id)
    if (error) { toast.error('Erro ao reprovar.'); setAtualizando(null); return }
    toast.success('Avaliação reprovada.')
    setLista(prev => prev.map(r => r.id === id ? { ...r, approved: false } : r))
    setAtualizando(null)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta avaliação permanentemente?')) return
    setAtualizando(id)
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir.'); setAtualizando(null); return }
    toast.success('Avaliação excluída.')
    setLista(prev => prev.filter(r => r.id !== id))
    setAtualizando(null)
  }

  const pendentes = lista.filter(r => !r.approved).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-wide">Avaliações</h1>
          {pendentes > 0 && (
            <p className="text-sm text-yellow-400 mt-0.5">{pendentes} pendente{pendentes !== 1 ? 's' : ''} aguardando aprovação</p>
          )}
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] hover:text-white text-sm transition-all disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filtros + Busca */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-2">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filtro === f.value
                  ? 'bg-[#b2ea0f] text-black'
                  : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#9ca3af] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por cliente, produto ou comentário..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#b2ea0f]/50"
          />
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#9ca3af] text-sm">
          <RefreshCcw className="w-5 h-5 animate-spin mr-2" />
          Carregando avaliações...
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="text-center py-20 text-[#555] text-sm">
          Nenhuma avaliação encontrada.
        </div>
      ) : (
        <div className="space-y-3">
          {listaFiltrada.map(r => (
            <div
              key={r.id}
              className={`p-4 rounded-xl border transition-all ${
                r.approved
                  ? 'bg-[#111111] border-[#2a2a2a]'
                  : 'bg-[#111111] border-yellow-600/30'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Produto */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-[#b2ea0f] bg-[#b2ea0f]/10 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                      {r.products?.name ?? 'Produto removido'}
                    </span>
                    {!r.approved && (
                      <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 border border-yellow-800/30 px-2 py-0.5 rounded-full">
                        Pendente
                      </span>
                    )}
                  </div>

                  {/* Estrelas + label */}
                  <div className="flex items-center gap-1.5 mb-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= r.rating ? 'fill-[#b2ea0f] text-[#b2ea0f]' : 'text-[#2a2a2a]'}`}
                      />
                    ))}
                    <span className="text-xs text-[#b2ea0f] font-semibold ml-1">{LABELS[r.rating]}</span>
                  </div>

                  {/* Comentário */}
                  {r.comment && (
                    <p className="text-sm text-[#d1d5db] mb-2 line-clamp-3">"{r.comment}"</p>
                  )}

                  {/* Autor + data */}
                  <p className="text-xs text-[#9ca3af]">
                    <span className="font-semibold text-white">{r.customer_name}</span>
                    {' · '}
                    {new Date(r.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  {!r.approved ? (
                    <button
                      onClick={() => aprovar(r.id)}
                      disabled={atualizando === r.id}
                      title="Aprovar"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#b2ea0f]/10 border border-[#b2ea0f]/30 text-[#b2ea0f] hover:bg-[#b2ea0f]/20 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Aprovar
                    </button>
                  ) : (
                    <button
                      onClick={() => reprovar(r.id)}
                      disabled={atualizando === r.id}
                      title="Reprovar"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-800/30 text-yellow-400 hover:bg-yellow-400/20 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reprovar
                    </button>
                  )}
                  <button
                    onClick={() => excluir(r.id)}
                    disabled={atualizando === r.id}
                    title="Excluir"
                    className="p-1.5 rounded-lg text-[#555] hover:text-red-400 hover:bg-red-900/10 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
