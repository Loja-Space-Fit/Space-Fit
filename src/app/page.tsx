import { createClient } from '@/lib/supabase/server'
import type { Banner, Product, Category } from '@/types'
import BannerSlider from '@/components/store/BannerSlider'
import ProductCard from '@/components/store/ProductCard'
import CategoryCards from '@/components/store/CategoryCards'
import TestimonialsSection from '@/components/store/TestimonialsSection'
import Link from 'next/link'
import { ArrowRight, Zap, Flame, Shield, Trophy, Users, Truck, ShieldCheck, Package, MessageCircle } from 'lucide-react'

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
      <div className="relative bg-[#0d0d0d] border-b border-[#1a1a1a] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#b2ea0f]/40 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4">
          {[
            { Icon: Truck, title: 'Frete Grátis', sub: 'acima de R$299' },
            { Icon: ShieldCheck, title: 'Pagamento Seguro', sub: '100% protegido' },
            { Icon: Package, title: 'Entrega Rápida', sub: 'para todo Brasil' },
            { Icon: MessageCircle, title: 'Suporte', sub: 'via WhatsApp' },
          ].map(({ Icon, title, sub }, i) => (
            <div key={i} className="relative flex items-center gap-3 py-4 px-4 group [&:not(:last-child)]:border-r [&:not(:last-child)]:border-[#1a1a1a]">
              <div className="w-9 h-9 rounded-lg bg-[#b2ea0f]/10 border border-[#b2ea0f]/20 flex items-center justify-center shrink-0 group-hover:bg-[#b2ea0f]/20 group-hover:shadow-[0_0_12px_rgba(178,234,15,0.2)] transition-all">
                <Icon className="w-4 h-4 text-[#b2ea0f]" />
              </div>
              <div>
                <span className="text-white font-black text-xs uppercase tracking-wide block">{title}</span>
                <span className="text-[#9ca3af] text-[10px] font-medium">{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categorias */}
      <section className="max-w-7xl mx-auto px-4 py-14 md:py-20">
        <div className="flex items-end justify-between mb-10">
          <div className="flex items-start gap-4">
            <span className="w-1 h-10 bg-[#b2ea0f] rounded-full shrink-0 mt-1" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-[#b2ea0f]" />
                <span className="text-[#b2ea0f] text-xs font-black uppercase tracking-[0.25em]">Explore</span>
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight leading-none">
                Nossas <span className="text-[#b2ea0f]">Categorias</span>
              </h2>
              <p className="text-[#9ca3af] text-sm mt-2">Tudo para o seu treino em um só lugar</p>
            </div>
          </div>
        </div>
        <CategoryCards categories={(categories || []) as Category[]} />
      </section>

      {/* Produtos em destaque */}
      <section className="bg-[#0d0d0d] border-y border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 py-14 md:py-20">
          <div className="flex items-end justify-between mb-10">
            <div className="flex items-start gap-4">
              <span className="w-1 h-10 bg-[#b2ea0f] rounded-full shrink-0 mt-1" />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-[#b2ea0f]" />
                  <span className="text-[#b2ea0f] text-xs font-black uppercase tracking-[0.25em]">Destaques</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight leading-none">
                  Produtos em <span className="text-[#b2ea0f]">Destaque</span>
                </h2>
                <p className="text-[#9ca3af] text-sm mt-2">Os mais queridos pelos nossos clientes</p>
              </div>
            </div>
            <Link
              href="/categoria/roupas"
              className="hidden md:flex items-center gap-1.5 text-sm text-[#b2ea0f] hover:text-[#c8f040] font-bold transition-colors border border-[#b2ea0f]/30 hover:border-[#b2ea0f] px-4 py-2 rounded-full"
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
        </div>
      </section>

      {/* Depoimentos */}
      <TestimonialsSection />

      {/* Sobre */}
      <section className="relative overflow-hidden bg-[#0a0a0a] py-20">
        {/* Glow de fundo */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#b2ea0f]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#b2ea0f]/3 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Texto */}
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="w-8 h-px bg-[#b2ea0f]" />
                <span className="text-[#b2ea0f] text-xs font-black uppercase tracking-[0.25em]">Sobre nós</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase leading-tight mb-6">
                Mais que uma loja.<br />
                <span className="text-[#b2ea0f]">Um estilo de vida.</span>
              </h2>
              <p className="text-[#9ca3af] text-base md:text-lg leading-relaxed mb-4">
                A Space Fit nasceu da paixão pelo treino e pela evolução constante. Somos uma academia em Conceição das Alagoas, MG, dedicada a quem leva o esporte a sério e quer resultados de verdade.
              </p>
              <p className="text-[#9ca3af] text-base md:text-lg leading-relaxed mb-8">
                Roupas que aguentam o ritmo, suplementos que fazem a diferença e acessórios para quem não aceita limites. Do iniciante ao atleta — aqui você encontra tudo para ir além.
              </p>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP || '5534998853794'}?text=${encodeURIComponent('Olá! Quero saber mais sobre a Space Fit.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-green inline-flex shadow-[0_0_20px_rgba(178,234,15,0.3)]"
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
                  className="bg-[#111111] border border-[#1f1f1f] hover:border-[#b2ea0f]/40 rounded-2xl p-5 transition-all duration-300 group hover:bg-[#111111] hover:shadow-[0_0_20px_rgba(178,234,15,0.08)]"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#b2ea0f]/10 flex items-center justify-center mb-3 group-hover:bg-[#b2ea0f]/20 transition-colors group-hover:shadow-[0_0_14px_rgba(178,234,15,0.2)]">
                    <Icon className="w-5 h-5 text-[#b2ea0f]" />
                  </div>
                  <h3 className="text-white font-black uppercase text-sm mb-1.5">{title}</h3>
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
              <div key={label} className="relative border border-[#1f1f1f] hover:border-[#b2ea0f]/40 rounded-2xl p-6 text-center bg-[#111111] overflow-hidden group transition-all duration-300">
                <div className="absolute inset-0 bg-[#b2ea0f]/0 group-hover:bg-[#b2ea0f]/5 transition-colors duration-300" />
                <p className="text-3xl md:text-4xl font-black text-[#b2ea0f] mb-1 relative">{num}</p>
                <p className="text-[#6b7280] text-xs font-bold uppercase tracking-wide relative">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#8fbb00] via-[#b2ea0f] to-[#c8f040]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#8fbb00]" />
        <div className="relative max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-black/10 rounded-full px-4 py-1.5 mb-6">
            <Trophy className="w-3.5 h-3.5 text-black/70" />
            <span className="text-black/70 text-xs font-black uppercase tracking-[0.2em]">Comece agora</span>
          </div>
          <h2 className="text-3xl md:text-6xl font-black text-black uppercase tracking-tight leading-none mb-5">
            Pronto para<br />Evoluir?
          </h2>
          <p className="text-black/70 mb-10 text-base md:text-lg max-w-md mx-auto font-semibold">
            Equipamentos, roupas e suplementos para levar seu treino ao próximo nível.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/categoria/suplementos"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-black text-[#b2ea0f] font-black uppercase text-sm rounded-xl hover:bg-[#111] transition-all shadow-xl"
            >
              Ver Suplementos <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/categoria/roupas"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/20 hover:bg-white/30 text-black font-black uppercase text-sm rounded-xl transition-all border border-black/20"
            >
              Ver Roupas
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

