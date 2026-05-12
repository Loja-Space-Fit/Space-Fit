// PainelAlertas — painel completo de alertas operacionais do admin.
// Componente de servidor: busca os dados diretamente, sem props de entrada.
// Mostra 4 categorias de alerta com niveis de severidade distintos:
//   danger  — produtos sem estoque (invisiveis para clientes)
//   warning — estoque baixo | pedidos pendentes ha mais de 24h
//   info    — produtos sem venda nos ultimos 30 dias

import { buscarTodosAlertas } from '@/services/admin'
import AlertCard               from '@/components/admin/AlertCard'
import { CheckCircle }         from 'lucide-react'

export default async function PainelAlertas() {
  const alertas = await buscarTodosAlertas()

  const {
    estoque,
    pedidosPendentesAntigos,
    produtosSemVenda30d,
  } = alertas

  const totalAlertas =
    estoque.zerados.length +
    estoque.baixo.length +
    pedidosPendentesAntigos.length +
    produtosSemVenda30d.length

  // Nenhum alerta — mostra estado positivo
  if (totalAlertas === 0) {
    return (
      <div className="flex items-center gap-3 bg-[#b2ea0f]/10 border border-[#b2ea0f]/20 rounded-xl px-4 py-3">
        <CheckCircle className="w-4 h-4 text-[#b2ea0f] shrink-0" />
        <p className="text-sm text-[#b2ea0f] font-semibold">
          Tudo certo, nenhum alerta operacional no momento.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ---------------------------------------------------------------- */}
      {/* DANGER: Produtos sem estoque */}
      {/* ---------------------------------------------------------------- */}
      {estoque.zerados.length > 0 && (
        <AlertCard
          nivel="danger"
          titulo={`${estoque.zerados.length} produto${estoque.zerados.length > 1 ? 's' : ''} sem estoque`}
          descricao="Estes produtos estao invisiveis para os clientes enquanto o estoque for zero."
        >
          <div className="flex flex-wrap gap-2 mt-2">
            {estoque.zerados.map(p => (
              <a
                key={p.id}
                href="/admin/produtos"
                className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-xs text-red-300 hover:bg-red-500/20 transition-colors"
              >
                {p.name}
              </a>
            ))}
          </div>
        </AlertCard>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* WARNING: Estoque baixo */}
      {/* ---------------------------------------------------------------- */}
      {estoque.baixo.length > 0 && (
        <AlertCard
          nivel="warning"
          titulo={`${estoque.baixo.length} produto${estoque.baixo.length > 1 ? 's' : ''} com estoque baixo`}
          descricao="Repor antes que esgotem, menos de 5 unidades restantes."
        >
          <div className="flex flex-wrap gap-2 mt-2">
            {estoque.baixo.map(p => (
              <a
                key={p.id}
                href="/admin/produtos"
                className="px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs text-yellow-300 hover:bg-yellow-500/20 transition-colors"
              >
                {p.name}: {p.stock} un.
              </a>
            ))}
          </div>
        </AlertCard>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* WARNING: Pedidos pendentes ha mais de 24h */}
      {/* ---------------------------------------------------------------- */}
      {pedidosPendentesAntigos.length > 0 && (
        <AlertCard
          nivel="warning"
          titulo={`${pedidosPendentesAntigos.length} pedido${pedidosPendentesAntigos.length > 1 ? 's' : ''} pendente${pedidosPendentesAntigos.length > 1 ? 's' : ''} ha mais de 24h`}
          descricao="Estes pedidos ainda nao foram pagos. Podem ser abandono de carrinho."
        >
          <div className="flex flex-col gap-1.5 mt-2">
            {pedidosPendentesAntigos.map(p => (
              <a
                key={p.id}
                href="/admin/pedidos"
                className="flex items-center justify-between px-3 py-1.5 bg-yellow-500/5 border border-yellow-500/15 rounded-lg hover:bg-yellow-500/10 transition-colors"
              >
                <span className="text-xs font-bold text-yellow-300">{p.order_number}</span>
                <span className="text-xs text-[#9ca3af]">{p.customer_name}</span>
                <span className="text-xs text-yellow-400/70">{p.horas_aguardando}h aguardando</span>
              </a>
            ))}
          </div>
        </AlertCard>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* INFO: Produtos sem venda em 30 dias */}
      {/* ---------------------------------------------------------------- */}
      {produtosSemVenda30d.length > 0 && (
        <AlertCard
          nivel="info"
          titulo={`${produtosSemVenda30d.length} produto${produtosSemVenda30d.length > 1 ? 's' : ''} sem venda nos ultimos 30 dias`}
          descricao="Considerar promocao, revisao de preco ou desativacao."
          dispensavel
        >
          <div className="flex flex-wrap gap-2 mt-2">
            {produtosSemVenda30d.map(p => (
              <a
                key={p.id}
                href="/admin/produtos"
                className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-300 hover:bg-blue-500/20 transition-colors"
              >
                {p.name}
              </a>
            ))}
          </div>
        </AlertCard>
      )}

    </div>
  )
}
