'use client'

// BotaoExportarCSV — botao que dispara o download de um CSV no navegador.
// Recebe o conteudo ja formatado (gerado no server ou no client) e o nome
// do arquivo. Assim o componente e puro: nao conhece a estrutura dos dados.

import { baixarCSV } from '@/lib/csv'
import { Download }  from 'lucide-react'

interface PropsBotaoExportarCSV {
  conteudoCSV:  string
  nomeArquivo:  string   // sem extensao, ex: "clientes-2026-04"
  rotulo?:      string   // texto do botao, default "Exportar CSV"
  disabled?:    boolean
}

export default function BotaoExportarCSV({
  conteudoCSV,
  nomeArquivo,
  rotulo   = 'Exportar CSV',
  disabled = false,
}: PropsBotaoExportarCSV) {
  function exportar() {
    if (!conteudoCSV || disabled) return
    baixarCSV(nomeArquivo, conteudoCSV)
  }

  return (
    <button
      onClick={exportar}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-[#3a3a3a] text-[#9ca3af] hover:text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4" />
      {rotulo}
    </button>
  )
}
