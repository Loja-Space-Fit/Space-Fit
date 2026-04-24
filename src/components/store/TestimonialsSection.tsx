import { Star } from 'lucide-react'

const testimonials = [
  {
    name: 'Carlos Silva',
    role: 'Praticante de musculação',
    text: 'Os suplementos da Space Fit são de altíssima qualidade! O Whey Protein tem um sabor incrível e os resultados apareceram muito rápido.',
    rating: 5,
    avatar: 'CS',
  },
  {
    name: 'Ana Beatriz',
    role: 'Personal Trainer',
    text: 'Compro as roupas fitness aqui sempre. A qualidade dos tecidos é excepcional, aguenta treinos pesados e ainda fica bonita. Super recomendo!',
    rating: 5,
    avatar: 'AB',
  },
  {
    name: 'Ricardo Souza',
    role: 'Atleta amador',
    text: 'Atendimento via WhatsApp é sensacional. Tiraram todas as minhas dúvidas antes de comprar. Entrega rápida e produto impecável.',
    rating: 5,
    avatar: 'RS',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="relative bg-[#0a0a0a] py-16 md:py-24 overflow-hidden">
      {/* Glow sutil */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#b2ea0f]/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-px bg-[#b2ea0f]" />
            <span className="text-[#b2ea0f] text-xs font-black uppercase tracking-[0.25em]">Depoimentos</span>
            <span className="w-8 h-px bg-[#b2ea0f]" />
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight leading-none">
            O que nossos <span className="text-[#b2ea0f]">clientes</span> dizem
          </h2>
          <p className="text-[#9ca3af] mt-3 text-sm max-w-xs">Resultados reais de quem já treina com a Space Fit</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="relative rounded-2xl bg-[#111111] border border-[#1f1f1f] hover:border-[#b2ea0f]/30 transition-all duration-300 overflow-hidden group hover:shadow-[0_0_30px_rgba(178,234,15,0.07)]"
            >
              {/* Linha verde topo */}
              <div className="h-[2px] w-full bg-gradient-to-r from-[#b2ea0f] via-[#b2ea0f]/60 to-transparent" />

              <div className="p-6">
                {/* Aspas decorativas */}
                <div className="text-[80px] leading-none text-[#b2ea0f]/10 font-black absolute top-3 right-5 select-none pointer-events-none group-hover:text-[#b2ea0f]/20 transition-colors">
                  "
                </div>

                {/* Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-[#b2ea0f] text-[#b2ea0f]" />
                  ))}
                </div>

                <p className="text-[#d1d5db] text-sm leading-relaxed mb-6 relative z-10">"{t.text}"</p>

                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#b2ea0f] flex items-center justify-center text-black font-black text-sm shrink-0 shadow-[0_0_12px_rgba(178,234,15,0.4)]">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">{t.name}</p>
                    <p className="text-[#9ca3af] text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
