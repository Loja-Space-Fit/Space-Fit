'use client'

import { Printer } from 'lucide-react'

export default function BotaoImprimir() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 bg-[#b2ea0f] hover:bg-[#c8f040] text-black rounded-xl text-sm font-bold transition-colors"
    >
      <Printer className="w-4 h-4" />
      Imprimir
    </button>
  )
}
