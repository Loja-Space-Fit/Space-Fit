'use client'

import { useState } from 'react'
import { Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface ResultadoLimpeza {
  pedidosExcluidos: number
  cuponsDesativados: number
  avaliacoesExcluidas: number
  executadoEm: string
  erro?: string
}

export default function BotaoLimpezaBanco() {
  const [executando, setExecutando]             = useState(false)
  const [resultado, setResultado]               = useState<ResultadoLimpeza | null>(null)
  const [mostrarResultado, setMostrarResultado] = useState(false)

  async function executarLimpeza() {
    const confirmou = confirm(
      'Executar limpeza do banco?\n\n' +
      '- Pedidos pendentes com +30 dias serao excluidos\n' +
      '- Cupons expirados serao desativados\n' +
      '- Avaliacoes nao aprovadas com +60 dias serao excluidas'
    )
    if (!confirmou) return

    setExecutando(true)
    setResultado(null)
    setMostrarResultado(true)

    try {
      const resposta = await fetch('/api/admin/limpeza', { method: 'POST' })
      const json = await resposta.json()

      setResultado({
        pedidosExcluidos:    json.pedidos_excluidos    ?? 0,
        cuponsDesativados:   json.cupons_desativados   ?? 0,
        avaliacoesExcluidas: json.avaliacoes_excluidas ?? 0,
        executadoEm:         json.executado_em         ?? '',
        erro:                json.erro,
      })
    } catch {
      setResultado({
        pedidosExcluidos:    0,
        cuponsDesativados:   0,
        avaliacoesExcluidas: 0,
        executadoEm:         '',
        erro:                'Nao foi possivel conectar ao servidor. Tente novamente.',
      })
    } finally {
      setExecutando(false)
    }
  }

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-black text-white text-sm">Limpeza do Banco</h3>
          <p className="text-xs text-[#9ca3af] mt-0.5">Remove dados desnecessarios acumulados</p>
        </div>
        <button
          onClick={executarLimpeza}
          disabled={executando}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-sm font-bold transition-all disabled:opacity-50"
        >
          {executando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Limpando...</>
            : <><Trash2 className="w-4 h-4" /> Executar Limpeza</>
          }
        </button>
      </div>

      {mostrarResultado && resultado && (
        <div className={`mt-4 p-4 rounded-xl border text-sm ${
          resultado.erro
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-[#1a1a1a] border-[#2a2a2a]'
        }`}>
          {resultado.erro ? (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              {resultado.erro}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-[#b2ea0f] font-bold mb-3">
                <CheckCircle className="w-4 h-4" /> Limpeza concluida
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-[#111] rounded-lg">
                  <p className="text-xl font-black text-white">{resultado.pedidosExcluidos}</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">Pedidos excluidos</p>
                </div>
                <div className="text-center p-2 bg-[#111] rounded-lg">
                  <p className="text-xl font-black text-white">{resultado.cuponsDesativados}</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">Cupons desativados</p>
                </div>
                <div className="text-center p-2 bg-[#111] rounded-lg">
                  <p className="text-xl font-black text-white">{resultado.avaliacoesExcluidas}</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">Avaliacoes excluidas</p>
                </div>
              </div>
              {resultado.executadoEm && (
                <p className="text-[#9ca3af] text-xs mt-3 text-right">
                  {new Date(resultado.executadoEm).toLocaleString('pt-BR')}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
