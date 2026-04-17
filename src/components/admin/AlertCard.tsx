'use client'

// AlertCard — card de alerta com 3 niveis de severidade.
// Usado no PainelAlertas para destacar situacoes que precisam de atencao.

import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { useState } from 'react'

type NivelAlerta = 'info' | 'warning' | 'danger'

interface PropsAlertCard {
  nivel:       NivelAlerta
  titulo:      string
  descricao?:  string
  // Conteudo livre — usado para listar itens afetados (ex: produtos sem estoque)
  children?:   React.ReactNode
  // Se true, o usuario pode dispensar o alerta na sessao atual
  dispensavel?: boolean
}

// Paleta visual de cada nivel — mantida aqui para nao espalhar condicionais
const estilosPorNivel: Record<NivelAlerta, {
  container: string
  icone:     string
  Icone:     typeof AlertCircle
}> = {
  danger: {
    container: 'bg-red-500/10 border-red-500/30',
    icone:     'text-red-400',
    Icone:     AlertCircle,
  },
  warning: {
    container: 'bg-yellow-500/10 border-yellow-500/30',
    icone:     'text-yellow-400',
    Icone:     AlertTriangle,
  },
  info: {
    container: 'bg-blue-500/10 border-blue-500/30',
    icone:     'text-blue-400',
    Icone:     Info,
  },
}

export default function AlertCard({
  nivel,
  titulo,
  descricao,
  children,
  dispensavel = false,
}: PropsAlertCard) {
  const [dispensado, setDispensado] = useState(false)

  // Nao renderiza nada se o usuario dispensou — sem animacao de saida
  // para nao complexificar; o alerta volta ao recarregar a pagina
  if (dispensado) return null

  const { container, icone, Icone } = estilosPorNivel[nivel]

  return (
    <div className={`border rounded-xl p-4 ${container}`}>
      <div className="flex items-start gap-3">

        <Icone className={`w-4 h-4 mt-0.5 shrink-0 ${icone}`} />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${icone}`}>{titulo}</p>
          {descricao && (
            <p className="text-xs text-[#9ca3af] mt-0.5">{descricao}</p>
          )}
          {children && (
            <div className="mt-2">{children}</div>
          )}
        </div>

        {dispensavel && (
          <button
            onClick={() => setDispensado(true)}
            className="text-[#9ca3af] hover:text-white transition-colors shrink-0"
            aria-label="Dispensar alerta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

      </div>
    </div>
  )
}
