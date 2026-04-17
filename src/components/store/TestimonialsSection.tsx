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
    <section className="bg-[#111111] border-y border-[#2a2a2a] py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
            O que nossos <span className="text-[#b2ea0f]">clientes</span> dizem
          </h2>
          <p className="text-[#9ca3af] mt-2 text-sm">Resultados reais de quem já treina com a Space Fit</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a]">
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#b2ea0f] text-[#b2ea0f]" />
                ))}
              </div>
              <p className="text-[#d1d5db] text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#b2ea0f] flex items-center justify-center text-black font-black text-sm">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{t.name}</p>
                  <p className="text-[#9ca3af] text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
