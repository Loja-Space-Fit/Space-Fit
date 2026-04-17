'use client'

// CalendarioInput — substitui o <input type="date"> nativo com o mesmo design
// do calendário do gráfico (tema preto/verde). Seleciona uma única data.

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const MESES   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEM = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmt(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

interface Props {
  value:     string          // YYYY-MM-DD
  onChange:  (v: string) => void
  label?:    string
  minDate?:  string          // YYYY-MM-DD — dias anteriores desabilitados
  maxDate?:  string          // YYYY-MM-DD — dias posteriores desabilitados
  required?: boolean
  placeholder?: string
}

export default function CalendarioInput({
  value, onChange, label, minDate, maxDate, required, placeholder = 'Selecionar data',
}: Props) {
  const [aberto,  setAberto]  = useState(false)
  const [mesVis,  setMesVis]  = useState<Date>(() => {
    if (value) return new Date(value + 'T12:00:00')
    return new Date()
  })
  const ref = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Atualiza o mês visível quando o valor muda externamente
  useEffect(() => {
    if (value) setMesVis(new Date(value + 'T12:00:00'))
  }, [value])

  function prevMes() { setMesVis(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)) }
  function nextMes() { setMesVis(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)) }

  const ano  = mesVis.getFullYear()
  const mes  = mesVis.getMonth()

  // Limite de navegação: não avança além do mês do maxDate (ou +2 anos)
  const maxNav = maxDate ? new Date(maxDate + 'T12:00:00') : new Date(new Date().getFullYear() + 2, 11, 31)
  const isUltMes = ano === maxNav.getFullYear() && mes === maxNav.getMonth()
  const isPrimMes = minDate
    ? ano === new Date(minDate + 'T12:00:00').getFullYear() && mes === new Date(minDate + 'T12:00:00').getMonth()
    : false

  function handleDia(iso: string) {
    onChange(iso)
    setAberto(false)
  }

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
    <div className="relative" ref={ref}>
      {label && <label className="text-sm text-[#9ca3af] mb-1 block">{label}{required && ' *'}</label>}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setAberto(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 bg-[#111111] border rounded-xl text-sm transition-all text-left ${
          aberto
            ? 'border-[#b2ea0f]/50 bg-[#161616]'
            : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
        }`}
      >
        <Calendar className={`w-4 h-4 shrink-0 transition-colors ${value ? 'text-[#b2ea0f]' : 'text-[#444]'}`} />
        <span className={value ? 'text-white font-semibold' : 'text-[#555]'}>
          {value ? fmt(value) : placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange('') }}
            className="ml-auto text-[#444] hover:text-[#9ca3af] transition-colors text-base leading-none"
          >
            ×
          </button>
        )}
      </button>

      {/* Calendário dropdown */}
      {aberto && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] p-4 w-[284px] select-none">
          {/* Navegação de mês */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMes}
              disabled={isPrimMes}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1a1a1a] text-[#9ca3af] hover:text-[#b2ea0f] transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-white">{MESES[mes]} {ano}</span>
            <button
              type="button"
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
              <div key={d} className="text-center text-[10px] font-semibold text-[#b2ea0f]/60 py-1">{d}</div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7">
            {celulas.map((iso, i) => {
              if (!iso) return <div key={`e-${i}`} className="h-9" />
              const desabilitado =
                (!!minDate && iso < minDate) ||
                (!!maxDate && iso > maxDate)
              const selecionado = iso === value
              const hoje = iso === toIso(new Date())

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={desabilitado}
                  onClick={() => handleDia(iso)}
                  className={[
                    'h-9 w-full flex items-center justify-center text-xs font-semibold rounded-full transition-all',
                    desabilitado ? 'opacity-20 cursor-not-allowed text-[#444]' : '',
                    selecionado  ? 'bg-[#b2ea0f] text-black shadow-[0_0_10px_rgba(178,234,15,0.3)]' : '',
                    !selecionado && !desabilitado
                      ? 'text-[#9ca3af] hover:text-[#b2ea0f] hover:bg-[#b2ea0f]/10 cursor-pointer'
                      : '',
                    hoje && !selecionado ? 'ring-1 ring-[#b2ea0f]/40' : '',
                  ].join(' ')}
                >
                  {parseInt(iso.split('-')[2])}
                </button>
              )
            })}
          </div>

          {/* Hoje */}
          <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
            <button
              type="button"
              onClick={() => handleDia(toIso(new Date()))}
              className="w-full text-center text-xs text-[#9ca3af] hover:text-[#b2ea0f] transition-colors font-semibold py-1"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
