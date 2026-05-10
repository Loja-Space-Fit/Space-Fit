'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL } from '@/lib/utils'
import { Search, RefreshCcw, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { pedidosParaCSV, baixarCSV } from '@/lib/csv'
import toast from 'react-hot-toast'
import type { Order } from '@/types'

const PEDIDOS_POR_PAGINA = 20

// Mantemos os status em inglês pois são os valores reais do banco
const TODOS_STATUS = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled']

const ROTULO_STATUS: Record<string, string> = {
  pending:   'Pendente',
  paid:      'Pago',
  preparing: 'Preparando',
  shipped:   'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const COR_STATUS: Record<string, string> = {
  pending:   'bg-yellow-400/20 text-yellow-400 border border-yellow-800/30',
  paid:      'bg-green-400/20 text-green-400 border border-green-800/30',
  preparing: 'bg-blue-400/20 text-blue-400 border border-blue-800/30',
  shipped:   'bg-purple-400/20 text-purple-400 border border-purple-800/30',
  delivered: 'bg-[#b2ea0f]/20 text-[#b2ea0f] border border-[#b2ea0f]/30',
  cancelled: 'bg-red-400/20 text-red-400 border border-red-800/30',
}

const COR_PAGAMENTO: Record<string, string> = {
  pending:  'text-yellow-400',
  approved: 'text-[#b2ea0f]',
  rejected: 'text-red-400',
  refunded: 'text-gray-400',
}

const ROTULO_PAGAMENTO: Record<string, string> = {
  pending:  'Aguardando',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  refunded: 'Estornado',
}

export default function PaginaPedidosAdmin() {
  const [listaPedidos, setListaPedidos]   = useState<Order[]>([])
  const [carregando, setCarregando]       = useState(true)
  const [termoBusca, setTermoBusca]       = useState('')
  const [filtroStatus, setFiltroStatus]   = useState('all')
  const [atualizando, setAtualizando]     = useState<string | null>(null)
  const [excluindo, setExcluindo]         = useState<string | null>(null)
  const [pedidoAberto, setPedidoAberto]   = useState<string | null>(null)
  const [paginaAtual, setPaginaAtual]     = useState(1)

  // Volta para a pagina 1 sempre que o filtro ou busca muda
  useEffect(() => { setPaginaAtual(1) }, [filtroStatus, termoBusca])

  const carregarPedidos = useCallback(async () => {
    setCarregando(true)
    const supabase = createClient()

    let consulta = supabase
      .from('orders')
      .select('*')
      .eq('hidden_from_admin', false)
      .order('created_at', { ascending: false })

    // Só aplica o filtro se não for "todos"
    if (filtroStatus !== 'all') {
      consulta = consulta.eq('order_status', filtroStatus)
    }

    const { data: pedidos } = await consulta
    setListaPedidos((pedidos || []) as Order[])
    setCarregando(false)
  }, [filtroStatus])

  useEffect(() => { carregarPedidos() }, [carregarPedidos])

  // Subscription realtime — qualquer mudanca na tabela orders recarrega a lista.
  // Mantemos o botao manual como fallback caso o canal seja bloqueado.
  useEffect(() => {
    const supabase = createClient()
    const canal = supabase
      .channel('admin-pedidos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => { carregarPedidos() }
      )
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [carregarPedidos])

  async function excluirPedido(idPedido: string) {
    const confirmou = confirm('Tem certeza que deseja excluir este pedido? Esta acao nao pode ser desfeita.')
    if (!confirmou) return

    setExcluindo(idPedido)
    const res = await fetch(`/api/admin/pedidos/${idPedido}`, { method: 'DELETE' })
    const json = await res.json()

    if (!res.ok || json.erro) {
      toast.error('Erro ao excluir pedido. Tente novamente.')
    } else {
      setListaPedidos(anterior => anterior.filter(p => p.id !== idPedido))
      toast.success('Pedido excluido com sucesso.')
    }
    setExcluindo(null)
  }

  async function atualizarStatus(idPedido: string, novoStatus: string) {
    setAtualizando(idPedido)
    const supabase = createClient()

    // Ao cancelar, precisamos devolver o estoque e o uso do cupom.
    // Verificamos se o pedido ainda não estava cancelado para evitar reverter duas vezes.
    if (novoStatus === 'cancelled') {
      const pedido = listaPedidos.find(p => p.id === idPedido)

      if (pedido && pedido.order_status !== 'cancelled') {

        // Devolve estoque item por item
        for (const item of (pedido.items || [])) {
          const { data: produto } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single()

          if (produto) {
            await supabase
              .from('products')
              .update({ stock: produto.stock + item.quantity })
              .eq('id', item.product_id)
          }
        }

        // Devolve o uso do cupom se havia um aplicado
        if (pedido.coupon_code) {
          const { data: cupom } = await supabase
            .from('coupons')
            .select('uses_count')
            .eq('code', pedido.coupon_code)
            .single()

          if (cupom && cupom.uses_count > 0) {
            await supabase
              .from('coupons')
              .update({ uses_count: cupom.uses_count - 1 })
              .eq('code', pedido.coupon_code)
          }
        }
      }
    }

    const { error } = await supabase.from('orders').update({ order_status: novoStatus }).eq('id', idPedido)

    if (error) {
      toast.error('Erro ao atualizar status. Tente novamente.')
    } else {
      setListaPedidos(anterior =>
        anterior.map(p =>
          p.id === idPedido
            ? { ...p, order_status: novoStatus as Order['order_status'], ...(novoStatus === 'paid' ? { payment_status: 'approved' as Order['payment_status'] } : {}) }
            : p
        )
      )
      toast.success(`Status atualizado para ${ROTULO_STATUS[novoStatus]}.`)

      // Quando marcado como pago: atualiza payment_status e processa pontos via API
      if (novoStatus === 'paid') {
        fetch(`/api/admin/pedidos/${idPedido}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_status: novoStatus }),
        }).catch(e => console.error('[pedidos] Falha ao processar pontos:', e))
      }

      // Dispara email de notificacao para "Enviado" e "Entregue" — nao bloqueia UI
      if (novoStatus === 'shipped' || novoStatus === 'delivered') {
        fetch('/api/admin/email-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedidoId: idPedido, novoStatus }),
        }).catch(e => console.error('[pedidos] Falha ao disparar email de status:', e))
      }
    }

    setAtualizando(null)
  }

  // Filtro de busca por nome, numero do pedido ou telefone
  const pedidosFiltrados = listaPedidos.filter(pedido =>
    !termoBusca ||
    pedido.customer_name.toLowerCase().includes(termoBusca.toLowerCase()) ||
    pedido.order_number.includes(termoBusca) ||
    pedido.customer_phone.includes(termoBusca)
  )

  // Paginacao
  const totalPaginas   = Math.max(1, Math.ceil(pedidosFiltrados.length / PEDIDOS_POR_PAGINA))
  const paginaSegura   = Math.min(paginaAtual, totalPaginas)
  const inicio         = (paginaSegura - 1) * PEDIDOS_POR_PAGINA
  const pedidosPagina  = pedidosFiltrados.slice(inicio, inicio + PEDIDOS_POR_PAGINA)

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Pedidos</h1>
          <p className="text-[#9ca3af] text-sm">
            {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const conteudo = pedidosParaCSV(pedidosFiltrados as Parameters<typeof pedidosParaCSV>[0])
              const data = new Date().toISOString().slice(0, 10)
              baixarCSV(`pedidos-${data}`, conteudo)
            }}
            disabled={pedidosFiltrados.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-[#3a3a3a] text-[#9ca3af] hover:text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button
            onClick={carregarPedidos}
            className="flex items-center gap-2 text-sm text-[#9ca3af] hover:text-white transition-colors"
          >
            <RefreshCcw className="w-4 h-4" /> Atualizar
          </button>
        </div>
      </div>

      {/* Filtros de busca e status */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
          <input
            value={termoBusca}
            onChange={e => setTermoBusca(e.target.value)}
            placeholder="Buscar por nome, pedido ou telefone..."
            className="input pl-10 text-sm"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="input text-sm w-full sm:w-48"
        >
          <option value="all">Todos os status</option>
          {TODOS_STATUS.map(s => (
            <option key={s} value={s}>{ROTULO_STATUS[s]}</option>
          ))}
        </select>
      </div>

      {/* Lista de pedidos */}
      {carregando ? (
        <div className="text-center py-20 text-[#9ca3af]">Carregando pedidos...</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="text-center py-20 text-[#9ca3af]">Nenhum pedido encontrado</div>
      ) : (
        <div className="space-y-3">
          {pedidosPagina.map(pedido => (
            <div key={pedido.id} className="card-dark overflow-hidden">

              {/* Linha resumo — clique abre/fecha detalhes */}
              <div
                className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                onClick={() => setPedidoAberto(pedidoAberto === pedido.id ? null : pedido.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href={`/admin/pedidos/${pedido.id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-[#b2ea0f] font-black text-sm hover:text-[#c8f040] transition-colors"
                      title="Ver detalhes / imprimir"
                    >
                      {pedido.order_number}
                    </a>
                    <span className={`badge ${COR_STATUS[pedido.order_status]}`}>
                      {ROTULO_STATUS[pedido.order_status]}
                    </span>
                    <span className={`text-xs font-semibold ${COR_PAGAMENTO[pedido.payment_status]}`}>
                      {ROTULO_PAGAMENTO[pedido.payment_status]}
                    </span>
                  </div>
                  <p className="text-white font-semibold text-sm mt-1">{pedido.customer_name}</p>
                  <p className="text-[#9ca3af] text-xs">{pedido.customer_phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#b2ea0f] font-black text-lg">{formatBRL(pedido.total)}</p>
                  <p className="text-[#9ca3af] text-xs">
                    {new Date(pedido.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Detalhes expandidos */}
              {pedidoAberto === pedido.id && (
                <div className="border-t border-[#2a2a2a] p-4">

                  {/* Itens comprados */}
                  <h4 className="text-xs font-bold text-[#9ca3af] uppercase mb-3">Itens do Pedido</h4>
                  <div className="space-y-2 mb-4">
                    {(pedido.items || []).map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-white">
                          {item.product_name}
                          {item.size && <span className="text-[#9ca3af]"> — {item.size}</span>}
                          {' '}× {item.quantity}
                        </span>
                        <span className="text-[#b2ea0f] font-bold">{formatBRL(item.total_price)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Endereço de entrega (pode ser nulo em retirada na loja) */}
                  {pedido.address && (
                    <div className="mb-4 p-3 bg-[#1a1a1a] rounded-xl text-sm text-[#d1d5db]">
                      <p className="font-bold text-white mb-1">Endereço de Entrega</p>
                      <p>{pedido.address.street}, {pedido.address.number} {pedido.address.complement}</p>
                      <p>{pedido.address.neighborhood} — {pedido.address.city}/{pedido.address.state} — CEP {pedido.address.cep}</p>
                    </div>
                  )}

                  {/* Botões de mudança de status */}
                  <div className="mb-4">
                    <p className="text-xs font-bold text-[#9ca3af] uppercase mb-2">Atualizar Status</p>
                    <div className="flex flex-wrap gap-2">
                      {TODOS_STATUS.map(s => (
                        <button
                          key={s}
                          onClick={() => atualizarStatus(pedido.id, s)}
                          disabled={atualizando === pedido.id || pedido.order_status === s}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            pedido.order_status === s
                              ? COR_STATUS[s] + ' opacity-100'
                              : 'border-[#2a2a2a] text-[#9ca3af] hover:border-[#b2ea0f] hover:text-white'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {atualizando === pedido.id ? '...' : ROTULO_STATUS[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Exclusão fica aqui embaixo para não ser clicada por acidente */}
                  <div className="border-t border-[#2a2a2a] pt-4">
                    <button
                      onClick={() => excluirPedido(pedido.id)}
                      disabled={excluindo === pedido.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-400 border border-red-500/20 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                      {excluindo === pedido.id ? 'Excluindo...' : 'Excluir Pedido'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Paginacao */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-xs text-[#9ca3af]">
            Mostrando {inicio + 1}–{Math.min(inicio + PEDIDOS_POR_PAGINA, pedidosFiltrados.length)} de {pedidosFiltrados.length} pedidos
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaSegura === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] border border-[#2a2a2a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>

            {/* Numeros de pagina — mostra ate 5 ao redor da atual */}
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPaginas || Math.abs(n - paginaSegura) <= 2)
              .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(n)
                return acc
              }, [])
              .map((item, idx) =>
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-[#9ca3af] text-xs">...</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPaginaAtual(item as number)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      paginaSegura === item
                        ? 'bg-[#b2ea0f] text-black'
                        : 'text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] border border-[#2a2a2a]'
                    }`}
                  >
                    {item}
                  </button>
                )
              )
            }

            <button
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaSegura === totalPaginas}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#9ca3af] hover:text-white hover:bg-[#1a1a1a] border border-[#2a2a2a] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Proxima <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
