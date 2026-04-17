// CRM de clientes — agrega todos os pedidos por telefone do cliente,
// calcula total gasto, numero de pedidos e classifica cada um.
// Componente de servidor — busca os dados; FiltroClientes (client) faz a busca/filtro.

import { buscarClientesAgregados } from '@/services/admin'
import { formatBRL }               from '@/lib/utils'
import { clientesParaCSV }         from '@/lib/csv'
import BotaoExportarCSV            from '@/components/admin/BotaoExportarCSV'
import FiltroClientes              from '@/components/admin/FiltroClientes'
import { Users } from 'lucide-react'

// =============================================================================
// Card de resumo no topo
// =============================================================================
function CardResumo({ rotulo, valor, sub, cor }: {
  rotulo: string; valor: string; sub?: string; cor: string
}) {
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl px-5 py-4">
      <p className="text-xs text-[#9ca3af] font-semibold uppercase tracking-wider">{rotulo}</p>
      <p className="text-2xl font-black mt-1" style={{ color: cor }}>{valor}</p>
      {sub && <p className="text-xs text-[#9ca3af] mt-0.5">{sub}</p>}
    </div>
  )
}

// =============================================================================
// PAGE
// =============================================================================
export default async function ClientesPage() {
  const clientes = await buscarClientesAgregados()

  const totalClientes    = clientes.length
  const totalVIPs        = clientes.filter(c => c.classificacao === 'VIP').length
  const totalRecorrentes = clientes.filter(c => c.classificacao === 'Recorrente').length
  const totalInativos    = clientes.filter(c => c.classificacao === 'Inativo').length
  const receitaTotal     = clientes.reduce((s, c) => s + c.total_gasto, 0)
  const ticketMedio      = totalClientes > 0 ? receitaTotal / totalClientes : 0

  const dataHoje    = new Date().toISOString().slice(0, 10)
  const csvClientes = clientesParaCSV(clientes)

  return (
    <div className="flex flex-col gap-6">

      {/* Cabecalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-[#b2ea0f]" />
            Clientes
          </h1>
          <p className="text-[#9ca3af] text-sm mt-1">
            Agregado de todos os pedidos &mdash; {totalClientes} clientes cadastrados
          </p>
        </div>
        <BotaoExportarCSV
          conteudoCSV={csvClientes}
          nomeArquivo={`clientes-${dataHoje}`}
          disabled={totalClientes === 0}
        />
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardResumo rotulo="Total de Clientes" valor={totalClientes.toString()}     cor="#b2ea0f" sub={`${formatBRL(receitaTotal)} em receita`} />
        <CardResumo rotulo="VIPs"              valor={totalVIPs.toString()}          cor="#f59e0b" sub="Top 20% por gasto" />
        <CardResumo rotulo="Recorrentes"       valor={totalRecorrentes.toString()}   cor="#b2ea0f" sub="2 ou mais compras" />
        <CardResumo rotulo="Inativos"          valor={totalInativos.toString()}      cor="#9ca3af" sub="Sem compra ha 60+ dias" />
      </div>

      {/* Tabela interativa com busca e filtro */}
      <FiltroClientes clientes={clientes} ticketMedio={ticketMedio} />

    </div>
  )
}