// TopProductsList — lista dos produtos mais vendidos com barra de progresso.
// Componente de servidor — nao precisa de 'use client' porque nao tem interacao.
// A barra de cada produto e proporcional ao produto que mais vendeu (100%).

import type { ProdutoMaisVendido } from '@/services/admin'
import { formatBRL } from '@/lib/utils'
import { ShoppingCart } from 'lucide-react'

interface PropsTopProductsList {
  produtos: ProdutoMaisVendido[]
}

export default function TopProductsList({ produtos }: PropsTopProductsList) {
  // Referencia para calcular a proporcao das barras
  const maxQuantidade = produtos[0]?.quantidade_vendida ?? 1

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 flex flex-col">
      <p className="text-xs text-[#9ca3af] font-semibold uppercase tracking-wider mb-5">
        Top Produtos
      </p>

      {produtos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#9ca3af]">Nenhuma venda registrada</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {produtos.map((produto, posicao) => {
            const proporcao = (produto.quantidade_vendida / maxQuantidade) * 100

            return (
              <li key={produto.produto_id} className="flex items-start gap-3">
                {/* Posicao */}
                <span className="text-xs text-[#9ca3af] font-bold mt-0.5 w-4 shrink-0">
                  {posicao + 1}
                </span>

                {/* Nome + barra + receita */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-sm text-white font-semibold truncate">
                      {produto.nome}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <ShoppingCart className="w-3 h-3 text-[#9ca3af]" />
                      <span className="text-xs text-[#9ca3af]">
                        {produto.quantidade_vendida}
                      </span>
                    </div>
                  </div>

                  {/* Barra de progresso */}
                  <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width:      `${proporcao}%`,
                        background: posicao === 0 ? '#b2ea0f' : '#2a2a2a',
                        opacity:    posicao === 0 ? 1 : Math.max(0.35, 1 - posicao * 0.15),
                      }}
                    />
                  </div>

                  {/* Receita gerada */}
                  <p className="text-xs text-[#9ca3af] mt-1">
                    {formatBRL(produto.receita_gerada)} em receita
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
