// MetricCard — card reutilizavel para qualquer metrica do dashboard.
// Mostra: valor principal, label, icone colorido, sub-texto e variacao
// percentual em relacao ao periodo anterior (seta verde/vermelha).

import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PropsMetricCard {
  rotulo:      string          // ex: "Receita Hoje"
  valor:       string          // ja formatado: "R$ 1.250,00" ou "42"
  icone:       LucideIcon
  cor?:        string          // cor do icone e fundo, default verde
  subTexto?:   string          // linha pequena abaixo do valor
  variacao?:   number          // percentual vs periodo anterior (pode ser negativo)
  descVariacao?: string        // ex: "vs ontem", "vs mes anterior"
  carregando?: boolean
}

export default function MetricCard({
  rotulo,
  valor,
  icone: Icone,
  cor          = '#b2ea0f',
  subTexto,
  variacao,
  descVariacao = 'vs periodo anterior',
  carregando   = false,
}: PropsMetricCard) {

  // Determina o icone e a cor da variacao percentual
  const variacaoPositiva = variacao !== undefined && variacao > 0
  const variacaoNegativa = variacao !== undefined && variacao < 0
  const variacaoNeutra   = variacao !== undefined && variacao === 0

  if (carregando) {
    return (
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 w-24 bg-[#2a2a2a] rounded" />
          <div className="w-8 h-8 bg-[#2a2a2a] rounded-lg" />
        </div>
        <div className="h-7 w-28 bg-[#2a2a2a] rounded mb-2" />
        <div className="h-2.5 w-20 bg-[#2a2a2a] rounded" />
      </div>
    )
  }

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 flex flex-col gap-3">

      {/* Cabecalho: label + icone */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#9ca3af] font-semibold uppercase tracking-wider leading-none">
          {rotulo}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${cor}20` }}
        >
          <Icone className="w-4 h-4" style={{ color: cor }} />
        </div>
      </div>

      {/* Valor principal */}
      <p className="text-2xl font-black text-white leading-none">{valor}</p>

      {/* Rodape: sub-texto e variacao */}
      <div className="flex items-center justify-between gap-2 min-h-[16px]">
        {subTexto && (
          <p className="text-xs text-[#9ca3af] truncate">{subTexto}</p>
        )}

        {/* Indicador de variacao percentual */}
        {variacao !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold shrink-0 ml-auto ${
            variacaoPositiva ? 'text-[#b2ea0f]' :
            variacaoNegativa ? 'text-red-400'   :
            'text-[#9ca3af]'
          }`}>
            {variacaoPositiva && <TrendingUp  className="w-3 h-3" />}
            {variacaoNegativa && <TrendingDown className="w-3 h-3" />}
            {variacaoNeutra   && <Minus        className="w-3 h-3" />}
            <span title={descVariacao}>
              {variacaoPositiva ? '+' : ''}{variacao.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}


