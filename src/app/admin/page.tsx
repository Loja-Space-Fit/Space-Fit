// Dashboard administrativo — servidor, busca tudo em paralelo e passa
// dados prontos para os componentes filhos (alguns client, outros server).

import {
  DollarSign,
  ShoppingBag,
  Clock,
  TrendingUp,
  Package,
  Users,
  UserCheck,
  BarChart2,
} from 'lucide-react'

import {
  buscarMetricasDashboard,
  buscarTopProdutos,
  buscarPedidosRecentes,
} from '@/services/admin'

import { formatBRL, calcularVariacao } from '@/lib/utils'
import MetricCard        from '@/components/admin/MetricCard'
import PainelAlertas     from '@/components/admin/PainelAlertas'
import GraficoVendas     from '@/components/admin/GraficoVendas'
import TopProductsList   from '@/components/admin/TopProductsList'
import BotaoLimpezaBanco   from '@/components/admin/CleanupButton'
import BotaoReprocessarPontos from '@/components/admin/ReprocessarPontosButton'

// =============================================================================
// Paleta de status — usada na tabela de pedidos recentes
// =============================================================================
const badgeStatus: Record<string, { bg: string; texto: string; rotulo: string }> = {
  pending:   { bg: 'bg-yellow-400/15', texto: 'text-yellow-400', rotulo: 'Pendente'   },
  paid:      { bg: 'bg-[#b2ea0f]/15',  texto: 'text-[#b2ea0f]',  rotulo: 'Pago'       },
  preparing: { bg: 'bg-blue-400/15',   texto: 'text-blue-400',   rotulo: 'Preparando' },
  shipped:   { bg: 'bg-purple-400/15', texto: 'text-purple-400', rotulo: 'Enviado'    },
  delivered: { bg: 'bg-emerald-400/15',texto: 'text-emerald-400',rotulo: 'Entregue'   },
  cancelled: { bg: 'bg-red-400/15',    texto: 'text-red-400',    rotulo: 'Cancelado'  },
}

// =============================================================================
// PAGE
// =============================================================================
export default async function AdminDashboard() {
  // Grafico de vendas é buscado client-side via GraficoVendas (sem recarregar)
  const [metricas, topProdutos, pedidosRecentes] =
    await Promise.all([
      buscarMetricasDashboard(),
      buscarTopProdutos(5),
      buscarPedidosRecentes(10),
    ])

  // Pre-calcula variacoes para os cards
  const variacaoReceitaHoje = calcularVariacao(metricas.receitaHoje, metricas.receitaOntem)
  const variacaoReceitaMes  = calcularVariacao(metricas.receitaMesAtual, metricas.receitaMesAnterior)
  const variacaoPedidosHoje = calcularVariacao(metricas.pedidosHoje, metricas.pedidosOntem)

  return (
    <div className="flex flex-col gap-6">

      {/* Titulo */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Dashboard</h1>
          <p className="text-[#9ca3af] text-sm mt-1">Painel administrativo Space Fit</p>
        </div>
      </div>

      {/* ================================================================ */}
      {/* LINHA 1 — Receita e pedidos principais */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <MetricCard
          rotulo="Receita Hoje"
          valor={formatBRL(metricas.receitaHoje)}
          icone={DollarSign}
          cor="#b2ea0f"
          subTexto={`Ontem: ${formatBRL(metricas.receitaOntem)}`}
          variacao={variacaoReceitaHoje}
          descVariacao="vs ontem"
        />

        <MetricCard
          rotulo="Receita Pendente"
          valor={formatBRL(metricas.receitaHojePendente)}
          icone={Clock}
          cor={metricas.receitaHojePendente > 0 ? '#f59e0b' : '#9ca3af'}
          subTexto="Pagamentos aguardando aprovação"
        />

        <MetricCard
          rotulo="Receita do Mes"
          valor={formatBRL(metricas.receitaMesAtual)}
          icone={TrendingUp}
          cor="#b2ea0f"
          subTexto={`Mes anterior: ${formatBRL(metricas.receitaMesAnterior)}`}
          variacao={variacaoReceitaMes}
          descVariacao="vs mes anterior"
        />

        <MetricCard
          rotulo="Pedidos Hoje"
          valor={metricas.pedidosHoje.toString()}
          icone={ShoppingBag}
          cor="#60a5fa"
          subTexto={`7 dias: ${metricas.pedidos7dias} pedidos`}
          variacao={variacaoPedidosHoje}
          descVariacao="vs ontem"
        />

        <MetricCard
          rotulo="Pedidos Pendentes"
          valor={metricas.pedidosPendentes.toString()}
          icone={Clock}
          cor={metricas.pedidosPendentes > 0 ? '#f59e0b' : '#b2ea0f'}
          subTexto={metricas.pedidosPendentes > 0 ? 'Precisam de atencao' : 'Tudo em dia'}
        />

      </div>

      {/* ================================================================ */}
      {/* LINHA 2 — Metricas secundarias */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <MetricCard
          rotulo="Ticket Medio"
          valor={formatBRL(metricas.ticketMedio)}
          icone={BarChart2}
          cor="#a78bfa"
          subTexto="Pedidos aprovados"
        />

        <MetricCard
          rotulo="Produtos Ativos"
          valor={metricas.totalProdutosAtivos.toString()}
          icone={Package}
          cor="#b2ea0f"
          subTexto={
            metricas.produtosEstoqueZerado > 0
              ? `${metricas.produtosEstoqueZerado} sem estoque`
              : `${metricas.produtosEstoqueBaixo} com estoque baixo`
          }
        />

        <MetricCard
          rotulo="Clientes Novos (30d)"
          valor={metricas.clientesNovos30d.toString()}
          icone={Users}
          cor="#34d399"
          subTexto="Primeira compra no periodo"
        />

        <MetricCard
          rotulo="Recorrentes (30d)"
          valor={metricas.clientesRecorrentes30d.toString()}
          icone={UserCheck}
          cor="#b2ea0f"
          subTexto="Compraram 2 ou mais vezes"
        />

      </div>

      {/* ================================================================ */}
      {/* LINHA 3 — Painel de alertas operacionais */}
      {/* ================================================================ */}
      <PainelAlertas />

      {/* ================================================================ */}
      {/* LINHA 4 — Grafico + Top Produtos */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GraficoVendas diasInicial={30} />
        </div>
        <div>
          <TopProductsList produtos={topProdutos} />
        </div>
      </div>

      {/* ================================================================ */}
      {/* LINHA 5 — Ultimos pedidos */}
      {/* ================================================================ */}
      <div className="card-dark overflow-hidden">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <h2 className="font-black text-white text-sm">Ultimos Pedidos</h2>
          <a
            href="/admin/pedidos"
            className="text-xs text-[#b2ea0f] hover:text-[#c8f040] font-semibold transition-colors"
          >
            Ver todos
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-xs text-[#9ca3af] uppercase tracking-wider">
                <th className="text-left px-5 py-3">Pedido</th>
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-right px-5 py-3">Total</th>
                <th className="text-center px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {pedidosRecentes.map(pedido => {
                const badge = badgeStatus[pedido.order_status] ?? {
                  bg: 'bg-[#2a2a2a]', texto: 'text-[#9ca3af]', rotulo: pedido.order_status,
                }
                return (
                  <tr
                    key={pedido.id}
                    className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <a
                        href="/admin/pedidos"
                        className="text-[#b2ea0f] font-bold text-sm hover:text-[#c8f040]"
                      >
                        {pedido.order_number}
                      </a>
                    </td>
                    <td className="px-5 py-3 text-sm text-white">{pedido.customer_name}</td>
                    <td className="px-5 py-3 text-right text-sm font-bold text-white">
                      {formatBRL(pedido.total)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.texto}`}>
                        {badge.rotulo}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-[#9ca3af]">
                      {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                )
              })}

              {pedidosRecentes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-[#9ca3af] text-sm">
                    Nenhum pedido registrado ainda
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================ */}
      {/* LINHA 6 — Manutencao do banco */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BotaoLimpezaBanco />
        <BotaoReprocessarPontos />
      </div>

    </div>
  )
}