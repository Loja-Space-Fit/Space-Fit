import type { Metadata } from 'next'
import NossosPlanos from '@/components/store/NossosPlanos'
import { Dumbbell } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Nossos Planos | Space Fit Academia',
  description: 'Conheça os planos da Space Fit Academia nas unidades de Conceição das Alagoas - MG e Guaíra - SP. Planos mensais, trimestrais, semestrais, anuais e premium.',
}

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">

      {/* Hero da página */}
      <div className="relative overflow-hidden bg-[#0a0a0a] border-b border-[#1a1a1a]">
        {/* Glow de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#b2ea0f]/8 rounded-full blur-3xl pointer-events-none" />

        {/* Linha decorativa lateral esquerda */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#b2ea0f]/60 to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#b2ea0f]/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 py-16 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 bg-[#b2ea0f]/10 border border-[#b2ea0f]/30 rounded-full px-5 py-2 mb-6">
            <Dumbbell className="w-4 h-4 text-[#b2ea0f]" />
            <span className="text-[#b2ea0f] text-sm font-black uppercase tracking-widest">Space Fit Academia</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-white uppercase leading-none mb-4">
            Nossos <span className="text-[#b2ea0f]">Planos</span>
          </h1>

          <p className="text-[#9ca3af] text-lg max-w-xl mx-auto">
            Duas unidades, uma missão: transformar sua vida através do esporte.
            Escolha o plano ideal para você.
          </p>

          {/* Separador decorativo */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className="w-16 h-px bg-gradient-to-r from-transparent to-[#b2ea0f]/50" />
            <span className="w-2 h-2 rounded-full bg-[#b2ea0f]" />
            <span className="w-16 h-px bg-gradient-to-l from-transparent to-[#b2ea0f]/50" />
          </div>
        </div>
      </div>

      {/* Componente de planos (sem o padding-top do hero pois a página já tem) */}
      <NossosPlanos hideHero />
    </main>
  )
}
