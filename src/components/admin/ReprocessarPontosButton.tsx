'use client'

import { useState } from 'react'
import { Star, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface Resultado {
  processados: number
  erros: number
  errosDetalhados?: string[]
  total: number
  erro?: string
}

export default function BotaoReprocessarPontos() {
  const [executando, setExecutando] = useState(false)
  const [resultado, setResultado]   = useState<Resultado | null>(null)

  async function executar() {
    setExecutando(true)
    setResultado(null)
    try {
      const res  = await fetch('/api/admin/reprocessar-pontos', { method: 'POST' })
      const json = await res.json()
      setResultado(json)
    } catch {
      setResultado({ processados: 0, erros: 1, total: 0, erro: 'Não foi possível conectar ao servidor.' })
    } finally {
      setExecutando(false)
    }
  }

  return (
    <div className="card-dark p-5">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="font-black text-white text-sm">Reprocessar Space Points</h3>
          <p className="text-xs text-[#9ca3af] mt-0.5">Credita pontos de todos os pedidos pagos sem pontos</p>
        </div>
        <button
          onClick={executar}
          disabled={executando}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#b2ea0f]/10 border border-[#b2ea0f]/20 text-[#b2ea0f] hover:bg-[#b2ea0f]/20 text-sm font-bold transition-all disabled:opacity-50"
        >
          {executando
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
            : <><Star className="w-4 h-4" /> Executar</>
          }
        </button>
      </div>

      {resultado && (
        <div className={`mt-4 p-4 rounded-xl border text-sm ${
          resultado.erro ? 'bg-red-500/10 border-red-500/20' : 'bg-[#1a1a1a] border-[#2a2a2a]'
        }`}>
          {resultado.erro ? (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" /> {resultado.erro}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-[#b2ea0f] font-bold mb-3">
                <CheckCircle className="w-4 h-4" /> Concluído
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-[#111] rounded-lg">
                  <p className="text-xl font-black text-white">{resultado.total}</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">Pedidos pagos</p>
                </div>
                <div className="text-center p-2 bg-[#111] rounded-lg">
                  <p className="text-xl font-black text-[#b2ea0f]">{resultado.processados}</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">Processados</p>
                </div>
                <div className="text-center p-2 bg-[#111] rounded-lg">
                  <p className="text-xl font-black text-red-400">{resultado.erros}</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">Erros</p>
                </div>
              </div>              {resultado.errosDetalhados && resultado.errosDetalhados.length > 0 && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-400 font-bold mb-1">Detalhes dos erros:</p>
                  {resultado.errosDetalhados.map((e, i) => (
                    <p key={i} className="text-xs text-red-300 break-all">{e}</p>
                  ))}
                </div>
              )}            </>
          )}
        </div>
      )}
    </div>
  )
}
