import { createClient } from '@/lib/supabase/server'
import type { Banner, Product, Category } from '@/types'
import BannerSlider from '@/components/store/BannerSlider'
import ProductCard from '@/components/store/ProductCard'
import CategoryCards from '@/components/store/CategoryCards'
import TestimonialsSection from '@/components/store/TestimonialsSection'
import Link from 'next/link'
import NossosPlanos from '@/components/store/NossosPlanos'
import { ArrowRight, Zap, Flame, Shield, Trophy, Users } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: banners }, { data: featured }, { data: categories }] = await Promise.all([
    supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .order('display_order'),
    supabase
      .from('products')
      .select('*, category:categories(name, slug)')
      .eq('active', true)
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('display_order'),
  ])

  return (
    <div>
      {/* Hero Banner */}
      <BannerSlider banners={(banners || []) as Banner[]} />

      {/* Barra de benefícios */}
      <div className="bg-[#b2ea0f] text-black py-3">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-6 text-sm font-bold">
          <span>⚡ Frete Grátis acima de R$299</span>
          <span>🔒 Pagamento 100% Seguro</span>
          <span>📦 Entrega Rápida</span>
          <span>💬 Suporte via WhatsApp</span>
        </div>
      </div>

      {/* Categorias */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
              Nossas <span className="text-[#b2ea0f]">Categorias</span>
            </h2>
            <p className="text-[#9ca3af] text-sm mt-1">Tudo para o seu treino em um só lugar</p>
          </div>
        </div>
        <CategoryCards categories={(categories || []) as Category[]} />
      </section>

      {/* Produtos em destaque */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-[#b2ea0f]" />
              <span className="text-[#b2ea0f] text-sm font-bold uppercase tracking-widest">Destaques</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
              Produtos em <span className="text-[#b2ea0f]">Destaque</span>
            </h2>
          </div>
          <Link
            href="/categoria/roupas"
            className="hidden md:flex items-center gap-1 text-sm text-[#b2ea0f] hover:text-[#c8f040] font-semibold transition-colors"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(featured || []).map(product => (
            <ProductCard key={product.id} product={product as unknown as Product} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link href="/categoria/roupas" className="btn-outline">
            Ver Todos os Produtos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Depoimentos */}
      <TestimonialsSection />

      {/* Nossos Planos */}
      <NossosPlanos />

      {/* Sobre */}
      <section className="relative overflow-hidden bg-[#0d0d0d] border-y border-[#1a1a1a] py-20">
        {/* Glow de fundo */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#b2ea0f]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4">
          {/* Label */}
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-px bg-[#b2ea0f]" />
            <span className="text-[#b2ea0f] text-sm font-bold uppercase tracking-widest">Sobre nós</span>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Texto */}
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase leading-tight mb-6">
                Mais que uma loja.<br />
                <span className="text-[#b2ea0f]">Um estilo de vida.</span>
              </h2>
              <p className="text-[#9ca3af] text-lg leading-relaxed mb-4">
                A Space Fit nasceu da paixão pelo treino e pela evolução constante. Somos uma academia em Conceição das Alagoas, MG, dedicada a quem leva o esporte a sério e quer resultados de verdade.
              </p>
              <p className="text-[#9ca3af] text-lg leading-relaxed mb-8">
                Roupas que aguentam o ritmo, suplementos que fazem a diferença e acessórios para quem não aceita limites. Do iniciante ao atleta — aqui você encontra tudo para ir além.
              </p>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP || '5534998853794'}?text=${encodeURIComponent('Olá! Quero saber mais sobre a Space Fit.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-green inline-flex"
              >
                Fale com a gente <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Cards de valores */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Flame, title: 'Intensidade', desc: 'Produtos para treinos de verdade, sem moleza.' },
                { icon: Shield, title: 'Qualidade', desc: 'Materiais selecionados que duram e entregam resultado.' },
                { icon: Trophy, title: 'Performance', desc: 'Para quem quer superar marcas e bater recordes.' },
                { icon: Users, title: 'Comunidade', desc: 'Uma galera unida pela disciplina e pelo suor.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-[#111111] border border-[#1f1f1f] hover:border-[#b2ea0f]/30 rounded-2xl p-5 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#b2ea0f]/10 flex items-center justify-center mb-3 group-hover:bg-[#b2ea0f]/20 transition-colors">
                    <Icon className="w-5 h-5 text-[#b2ea0f]" />
                  </div>
                  <h3 className="text-white font-black uppercase text-sm mb-1">{title}</h3>
                  <p className="text-[#6b7280] text-sm leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { num: '500+', label: 'Produtos disponíveis' },
              { num: '2k+', label: 'Clientes satisfeitos' },
              { num: '4.9★', label: 'Avaliação média' },
              { num: '24h', label: 'Suporte no WhatsApp' },
            ].map(({ num, label }) => (
              <div key={label} className="border border-[#1f1f1f] rounded-2xl p-6 text-center bg-[#111111]">
                <p className="text-3xl font-black text-[#b2ea0f] mb-1">{num}</p>
                <p className="text-[#6b7280] text-sm font-semibold uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-[#111111] border-y border-[#2a2a2a] py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight mb-4">
            Pronto para <span className="text-[#b2ea0f]">Evoluir?</span>
          </h2>
          <p className="text-[#9ca3af] mb-8 text-lg">
            Equipamentos, roupas e suplementos para levar seu treino ao próximo nível.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/categoria/suplementos" className="btn-green">
              Ver Suplementos
            </Link>
            <Link href="/categoria/roupas" className="btn-outline">
              Ver Roupas
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

