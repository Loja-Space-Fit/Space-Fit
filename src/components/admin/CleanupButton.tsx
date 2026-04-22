'use client'

import { useState } from 'react'
import { Trash2, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react'

interface ResultadoLimpeza {
  pedidosExcluidos: number
  cuponsDesativados: number
  avaliacoesExcluidas: number
  executadoEm: string
  erro?: string
}

interface Contagem {
  pedidos_pendentes: number
  cupons_expirados: number
  avaliacoes_antigas: number
}

export default function BotaoLimpezaBanco() {
  const [executando, setExecutando]             = useState(false)
  const [resultado, setResultado]               = useState<ResultadoLimpeza | null>(null)
  const [mostrarResultado, setMostrarResultado] = useState(false)
  const [mostrarConfirm, setMostrarConfirm]     = useState(false)
  const [contagem, setContagem]                 = useState<Contagem | null>(null)
  const [carregandoContagem, setCarregandoContagem] = useState(false)

  async function pedirConfirmacao() {
    setMostrarConfirm(true)
    setCarregandoContagem(true)
    try {
      const res = await fetch('/api/admin/limpeza')
      const json = await res.json()
      setContagem(json)
    } catch {
      setContagem(null)
    } finally {
      setCarregandoContagem(false)
    }
  }

  async function executarLimpeza() {
    setMostrarConfirm(false)
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

  const itens = [
    { label: 'Pedidos pendentes com +30 dias serao excluidos', count: contagem?.pedidos_pendentes },
    { label: 'Cupons expirados serao desativados',             count: contagem?.cupons_expirados },
    { label: 'Avaliacoes nao aprovadas com +60 dias serao excluidas', count: contagem?.avaliacoes_antigas },
  ]

  return (
    <>
      {mostrarConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMostrarConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 shadow-2xl">
            <button onClick={() => setMostrarConfirm(false)} className="absolute top-4 right-4 text-[#9ca3af] hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-black text-white text-base">Limpeza do Banco</h3>
            </div>
            <p className="text-sm text-[#9ca3af] mb-4">As seguintes acoes serao executadas:</p>
            <ul className="space-y-2 mb-6">
              {itens.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2 text-sm text-[#d1d5db]">
                  <span className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    {item.label}
                  </span>
                  <span className={`shrink-0 font-black text-sm px-2 py-0.5 rounded-lg ${
                    item.count === undefined || carregandoContagem
                      ? 'text-[#555]'
                      : item.count > 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-[#1a1a1a] text-[#555]'
                  }`}>
                    {carregandoContagem ? '...' : `(${item.count ?? 0})`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button onClick={() => setMostrarConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-[#9ca3af] hover:text-white hover:border-[#3a3a3a] text-sm font-bold transition-all">
                Cancelar
              </button>
              <button onClick={executarLimpeza} className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 text-sm font-bold transition-all">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="font-black text-white text-sm">Limpeza do Banco</h3>
            <p className="text-xs text-[#9ca3af] mt-0.5">Remove dados desnecessarios acumulados</p>
          </div>
          <button
            onClick={pedirConfirmacao}
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
          <div className={`mt-4 p-4 rounded-xl border text-sm ${resultado.erro ? 'bg-red-500/10 border-red-500/20' : 'bg-[#1a1a1a] border-[#2a2a2a]'}`}>
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
    </>
  )
}
