'use client'

// FiltroClientes — busca por nome/email/telefone + filtro de classificacao.
// Recebe a lista completa do servidor e filtra no cliente sem round-trip.

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import type { ClienteResumo } from '@/services/admin'
import { formatBRL, formatPhone } from '@/lib/utils'
import { Crown, RefreshCcw, UserPlus, Clock } from 'lucide-react'

// ---------------------------------------------------------------------------
// Badge reutilizavel aqui dentro (client) sem depender do server component
// ---------------------------------------------------------------------------
function BadgeCliente({ classificacao }: { classificacao: ClienteResumo['classificacao'] }) {
  const estilos: Record<ClienteResumo['classificacao'], { classe: string; Icone: typeof Crown; rotulo: string }> = {
    VIP:        { classe: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/20', Icone: Crown,       rotulo: 'VIP'        },
    Recorrente: { classe: 'bg-[#b2ea0f]/15  text-[#b2ea0f]  border-[#b2ea0f]/20',  Icone: RefreshCcw,  rotulo: 'Recorrente' },
    Novo:       { classe: 'bg-blue-400/15   text-blue-400   border-blue-400/20',   Icone: UserPlus,    rotulo: 'Novo'       },
    Inativo:    { classe: 'bg-[#2a2a2a]     text-[#9ca3af]  border-[#3a3a3a]',     Icone: Clock,       rotulo: 'Inativo'    },
  }
  const { classe, Icone, rotulo } = estilos[classificacao]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${classe}`}>
      <Icone className="w-3 h-3" />
      {rotulo}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Tipo das classificacoes possíveis para o filtro
// ---------------------------------------------------------------------------
type Classificacao = ClienteResumo['classificacao'] | 'Todos'

const CLASSIFICACOES: { valor: Classificacao; rotulo: string }[] = [
  { valor: 'Todos',       rotulo: 'Todos'       },
  { valor: 'VIP',         rotulo: 'VIP'         },
  { valor: 'Recorrente',  rotulo: 'Recorrentes' },
  { valor: 'Novo',        rotulo: 'Novos'       },
  { valor: 'Inativo',     rotulo: 'Inativos'    },
]

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
interface PropsFiltroClientes {
  clientes: ClienteResumo[]
  ticketMedio: number
}

export default function FiltroClientes({ clientes, ticketMedio }: PropsFiltroClientes) {
  const [busca,          setBusca]          = useState('')
  const [classificacao,  setClassificacao]  = useState<Classificacao>('Todos')

  // Filtra localmente — sem re-fetch
  const clientesFiltrados = useMemo(() => {
    const termoBusca = busca.toLowerCase().trim()
    return clientes.filter(c => {
      const passaBusca =
        !termoBusca ||
        c.customer_name.toLowerCase().includes(termoBusca) ||
        c.customer_email?.toLowerCase().includes(termoBusca) ||
        c.customer_phone.includes(termoBusca)

      const passaClassificacao =
        classificacao === 'Todos' || c.classificacao === classificacao

      return passaBusca && passaClassificacao
    })
  }, [clientes, busca, classificacao])

  function limparFiltros() {
    setBusca('')
    setClassificacao('Todos')
  }

  const filtrosAtivos = busca.trim() !== '' || classificacao !== 'Todos'

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">

      {/* Cabecalho com busca e filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-[#2a2a2a]">

        {/* Campo de busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-sm text-white placeholder-[#9ca3af] focus:outline-none focus:border-[#b2ea0f]/50 transition-colors"
          />
        </div>

        {/* Filtro de classificacao */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {CLASSIFICACOES.map(({ valor, rotulo }) => (
            <button
              key={valor}
              onClick={() => setClassificacao(valor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                classificacao === valor
                  ? 'bg-[#b2ea0f] text-black'
                  : 'bg-[#1a1a1a] text-[#9ca3af] hover:text-white border border-[#2a2a2a]'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>

        {/* Limpar filtros */}
        {filtrosAtivos && (
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1 text-xs text-[#9ca3af] hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3" />
            Limpar
          </button>
        )}

        {/* Contagem */}
        <p className="text-xs text-[#9ca3af] flex-shrink-0">
          {clientesFiltrados.length === clientes.length
            ? `${clientes.length} clientes`
            : `${clientesFiltrados.length} de ${clientes.length}`}
          {' '}&middot; ticket medio{' '}
          <span className="text-white font-bold">{formatBRL(ticketMedio)}</span>
        </p>
      </div>

      {/* Tabela */}
      {clientesFiltrados.length === 0 ? (
        <div className="px-5 py-16 text-center text-[#9ca3af] text-sm">
          {filtrosAtivos
            ? 'Nenhum cliente encontrado com esses filtros.'
            : 'Nenhum cliente cadastrado ainda.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-xs text-[#9ca3af] uppercase tracking-wider">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Telefone</th>
                <th className="text-right px-5 py-3">Total Gasto</th>
                <th className="text-center px-5 py-3">Pedidos</th>
                <th className="text-center px-5 py-3">Status</th>
                <th className="text-right px-5 py-3 hidden lg:table-cell">Ultima Compra</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map(cliente => (
                <tr
                  key={cliente.customer_phone}
                  className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold text-white">{cliente.customer_name}</p>
                    {cliente.customer_email && (
                      <p className="text-xs text-[#9ca3af] mt-0.5 truncate max-w-[200px]">
                        {cliente.customer_email}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-3 text-sm text-[#9ca3af] hidden md:table-cell">
                    {formatPhone(cliente.customer_phone)}
                  </td>

                  <td className="px-5 py-3 text-right font-black text-white text-sm">
                    {formatBRL(cliente.total_gasto)}
                  </td>

                  <td className="px-5 py-3 text-center text-sm text-[#9ca3af]">
                    {cliente.total_pedidos}
                  </td>

                  <td className="px-5 py-3 text-center">
                    <BadgeCliente classificacao={cliente.classificacao} />
                  </td>

                  <td className="px-5 py-3 text-right text-xs text-[#9ca3af] hidden lg:table-cell">
                    {new Date(cliente.ultima_compra).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
