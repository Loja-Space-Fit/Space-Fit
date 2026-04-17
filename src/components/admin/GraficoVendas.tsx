'use client'

// GraficoVendas — gráfico de linha com seletor de período (presets + calendário
// personalizado com tema preto/verde). Busca dados via API route sem recarregar
// o dashboard.

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { formatBRL } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface VendaDiaria {
  data:    string
  receita: number
  pedidos: number
}

// ─── Helpers de data ──────────────────────────────────────────────────────────

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEM = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmt(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function TooltipPersonalizado({
  active, payload, label,
}: {
  active?:  boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?:   string
}) {
  if (!active || !payload?.length) return null
  const receita = (payload[0]?.value as number) ?? 0
  const pedidos = (payload[1]?.value as number) ?? 0
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-[#9ca3af] text-xs mb-1">{label}</p>
      <p className="text-[#b2ea0f] font-black">{formatBRL(receita)}</p>
      <p className="text-[#9ca3af] text-xs">{pedidos} {pedidos === 1 ? 'pedido' : 'pedidos'}</p>
    </div>
  )
}

// ─── Calendário ───────────────────────────────────────────────────────────────

function Calendario({
  onAplicar,
  onFechar,
}: {
  onAplicar: (de: string, ate: string) => void
  onFechar: () => void
}) {
  const hoje = toIso(new Date())
  const [mesVis,  setMesVis]  = useState(() => new Date())
  const [inicio,  setInicio]  = useState<string | null>(null)
  const [fim,     setFim]     = useState<string | null>(null)
  const [hover,   setHover]   = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onFechar()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onFechar])

  function prevMes() { setMesVis(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)) }
  function nextMes() { setMesVis(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)) }

  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth()
  const isUltMes = mesVis.getFullYear() === anoAtual && mesVis.getMonth() === mesAtual

  function handleDia(iso: string) {
    if (iso > hoje) return
    if (!inicio || (inicio && fim)) {
      setInicio(iso); setFim(null)
    } else {
      if (iso >= inicio) { setFim(iso) }
      else               { setInicio(iso); setFim(null) }
    }
  }

  function aplicar() {
    if (inicio && fim) onAplicar(inicio, fim)
    else if (inicio)   onAplicar(inicio, inicio)
  }

  // Verifica se um dia está no range selecionado (ou no preview com hover)
  function inRange(iso: string) {
    const de  = inicio
    const ate = fim ?? hover
    if (!de || !ate) return false
    const [mn, mx] = de <= ate ? [de, ate] : [ate, de]
    return iso > mn && iso < mx
  }

  // Células do mês atual com padding inicial
  const ano = mesVis.getFullYear()
  const mes = mesVis.getMonth()
  const offset    = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()

  const celulas: (string | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDias }, (_, i) =>
      `${ano}-${String(mes+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`
    ),
  ]
  while (celulas.length % 7 !== 0) celulas.push(null)

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-50 bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 w-[296px] select-none"
    >
      {/* Navegação de mês */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMes}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1a1a1a] text-[#9ca3af] hover:text-[#b2ea0f] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-white">
          {MESES[mes]} {ano}
        </span>
        <button
          onClick={nextMes}
          disabled={isUltMes}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1a1a1a] text-[#9ca3af] hover:text-[#b2ea0f] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEM.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#b2ea0f]/60 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid de dias — sem gap horizontal para range ficar contínuo */}
      <div className="grid grid-cols-7">
        {celulas.map((iso, i) => {
          if (!iso) return <div key={`e-${i}`} className="h-9" />

          const futuro   = iso > hoje
          const isInicio = iso === inicio
          const isFim    = iso === (fim ?? null)
          const isAtivo  = isInicio || isFim
          const isRange  = inRange(iso)
          const isHoje   = iso === hoje

          // Arredondamento das pontas do range
          let roundClass = ''
          if (isInicio && isFim)  roundClass = 'rounded-full'
          else if (isInicio)      roundClass = 'rounded-l-full'
          else if (isFim)         roundClass = 'rounded-r-full'

          return (
            <button
              key={iso}
              disabled={futuro}
              onClick={() => handleDia(iso)}
              onMouseEnter={() => inicio && !fim && setHover(iso)}
              onMouseLeave={() => setHover(null)}
              className={[
                'relative h-9 w-full flex items-center justify-center text-xs font-semibold transition-colors',
                futuro   ? 'opacity-20 cursor-not-allowed text-[#444]'        : '',
                isAtivo  ? `bg-[#b2ea0f] text-black ${roundClass}`            : '',
                isRange  ? 'bg-[#b2ea0f]/20 text-white'                       : '',
                !isAtivo && !isRange && !futuro
                         ? 'text-[#9ca3af] hover:text-[#b2ea0f] cursor-pointer' : '',
                isHoje && !isAtivo ? 'ring-1 ring-[#b2ea0f]/40 rounded-full'  : '',
              ].join(' ')}
            >
              {parseInt(iso.split('-')[2])}
            </button>
          )
        })}
      </div>

      {/* Feedback e botão aplicar */}
      <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
        {!inicio ? (
          <p className="text-[11px] text-[#444] text-center">Clique para selecionar o início</p>
        ) : !fim ? (
          <p className="text-[11px] text-[#9ca3af] text-center">
            De <span className="text-[#b2ea0f] font-bold">{fmt(inicio)}</span>{' '}
            — clique para selecionar o fim
          </p>
        ) : (
          <p className="text-[11px] text-[#9ca3af] text-center">
            De <span className="text-[#b2ea0f] font-bold">{fmt(inicio)}</span> até{' '}
            <span className="text-[#b2ea0f] font-bold">{fmt(fim)}</span>
          </p>
        )}
        {inicio && (
          <button
            onClick={aplicar}
            className="mt-2.5 w-full py-2 bg-[#b2ea0f] text-black text-xs font-black rounded-xl hover:bg-[#c8f040] transition-colors"
          >
            Aplicar período
          </button>
        )}
      </div>
    </div>
  )
}

// ─── GraficoVendas ────────────────────────────────────────────────────────────

const OPCOES_RAPIDAS = [
  { rotulo: '7d',  dias: 7  },
  { rotulo: '15d', dias: 15 },
  { rotulo: '30d', dias: 30 },
  { rotulo: '90d', dias: 90 },
]

export default function GraficoVendas({ diasInicial = 30 }: { diasInicial?: number }) {
  const [modo,      setModo]      = useState<'preset' | 'custom'>('preset')
  const [dias,      setDias]      = useState(diasInicial)
  const [customDe,  setCustomDe]  = useState<string | null>(null)
  const [customAte, setCustomAte] = useState<string | null>(null)
  const [dados,     setDados]     = useState<VendaDiaria[]>([])
  const [loading,   setLoading]   = useState(true)
  const [calAberto, setCalAberto] = useState(false)

  const buscar = useCallback(async (params: { dias?: number; de?: string; ate?: string }) => {
    setLoading(true)
    try {
      const q = new URLSearchParams()
      if (params.de && params.ate) { q.set('de', params.de); q.set('ate', params.ate) }
      else                          q.set('dias', String(params.dias ?? 30))
      const res = await fetch(`/api/admin/vendas-diarias?${q.toString()}`)
      if (!res.ok) throw new Error()
      setDados(await res.json())
    } catch {
      setDados([])
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { buscar({ dias: diasInicial }) }, [])

  function selecionarPreset(d: number) {
    if (loading) return
    setModo('preset'); setDias(d); setCalAberto(false)
    buscar({ dias: d })
  }

  function aplicarCustom(de: string, ate: string) {
    setModo('custom'); setCustomDe(de); setCustomAte(ate); setCalAberto(false)
    buscar({ de, ate })
  }

  const titulo = modo === 'custom' && customDe && customAte
    ? `Dados de ${fmt(customDe)} até ${fmt(customAte)}`
    : `Receita dos últimos ${dias} dias`

  const intervaloEixoX = dados.length > 14 ? 4 : dados.length > 7 ? 2 : 1

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <p className="text-xs text-[#9ca3af] font-semibold uppercase tracking-wider pt-2">
          {titulo}
        </p>

        {/* Controles de período */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Presets rápidos */}
          <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1">
            {OPCOES_RAPIDAS.map(({ rotulo, dias: d }) => (
              <button
                key={d}
                onClick={() => selecionarPreset(d)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modo === 'preset' && dias === d
                    ? 'bg-[#b2ea0f] text-black'
                    : 'text-[#9ca3af] hover:text-white disabled:cursor-wait'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>

          {/* Botão personalizar + calendário dropdown */}
          <div className="relative">
            <button
              onClick={() => setCalAberto(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                modo === 'custom'
                  ? 'bg-[#b2ea0f]/10 border-[#b2ea0f]/50 text-[#b2ea0f]'
                  : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#9ca3af] hover:text-white hover:border-[#3a3a3a]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Personalizar
            </button>

            {calAberto && (
              <Calendario
                onAplicar={aplicarCustom}
                onFechar={() => setCalAberto(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Gráfico */}
      {loading ? (
        <div className="h-[240px] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#b2ea0f] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : dados.length === 0 ? (
        <div className="h-[240px] flex items-center justify-center text-[#9ca3af] text-sm">
          Nenhuma venda registrada no período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={dados} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
            <XAxis
              dataKey="data"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={intervaloEixoX}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<TooltipPersonalizado />} />
            <Line
              type="monotone"
              dataKey="receita"
              stroke="#b2ea0f"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#b2ea0f' }}
            />
            <Line
              type="monotone"
              dataKey="pedidos"
              stroke="#4b5563"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: '#6b7280' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
