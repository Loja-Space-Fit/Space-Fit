import { createClient } from '@/lib/supabase/server'
import type { Product, Review } from '@/types'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { formatBRL, getDiscount, getWhatsAppLink } from '@/lib/utils'
import ProductPageClient from '@/components/store/ProductPageClient'
import { Star, Package, MessageCircle, Shield, Truck } from 'lucide-react'
import ProductCard from '@/components/store/ProductCard'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: p } = await supabase.from('products').select('name, description').eq('slug', slug).single()
  if (!p) return { title: 'Produto' }
  return {
    title: p.name,
    description: p.description || p.name,
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, category:categories(name, slug), reviews(*)')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!product) notFound()

  const p = product as unknown as Product & { reviews: Review[] }
  const discount = p.compare_price ? getDiscount(p.price, p.compare_price) : 0
  const approvedReviews = (p.reviews || []).filter(r => r.approved)
  const avgRating = approvedReviews.length
    ? approvedReviews.reduce((s, r) => s + r.rating, 0) / approvedReviews.length
    : 0

  // Produtos relacionados
  const { data: related } = p.category_id ? await supabase
    .from('products')
    .select('*')
    .eq('category_id', p.category_id)
    .eq('active', true)
    .neq('id', p.id)
    .limit(4) : { data: [] }

  const whatsappMsg = `Olá! Tenho interesse no produto: ${p.name} - ${formatBRL(p.price)}`

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-[#9ca3af] mb-6 flex items-center gap-2">
        <a href="/" className="hover:text-[#b2ea0f]">Início</a>
        <span>/</span>
        {p.category && (
          <>
            <a href={`/categoria/${(p.category as {slug:string}).slug}`} className="hover:text-[#b2ea0f] capitalize">
              {(p.category as {name:string}).name}
            </a>
            <span>/</span>
          </>
        )}
        <span className="text-white truncate">{p.name}</span>
      </nav>

      {/* Main product layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
        {/* Imagens */}
        <ProductPageClient product={p} />

        {/* Detalhes */}
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">{p.name}</h1>

          {/* Rating */}
          {approvedReviews.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-[#b2ea0f] text-[#b2ea0f]' : 'text-[#2a2a2a]'}`} />
                ))}
              </div>
              <span className="text-sm text-[#9ca3af]">{approvedReviews.length} avaliações</span>
            </div>
          )}

          {/* Preço */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-black text-[#b2ea0f]">{formatBRL(p.price)}</span>
            {p.compare_price && p.compare_price > p.price && (
              <>
                <span className="text-lg text-[#9ca3af] line-through">{formatBRL(p.compare_price)}</span>
                <span className="bg-[#b2ea0f] text-black text-sm font-black px-2 py-0.5 rounded">-{discount}%</span>
              </>
            )}
          </div>

          {/* Estoque */}
          <div className="flex items-center gap-2 mb-6">
            <Package className={`w-4 h-4 ${p.stock > 0 ? 'text-[#b2ea0f]' : 'text-red-400'}`} />
            <span className={`text-sm font-semibold ${p.stock > 0 ? 'text-[#b2ea0f]' : 'text-red-400'}`}>
              {p.stock > 0 ? `${p.stock} unidades disponíveis` : 'Produto Esgotado'}
            </span>
          </div>

          {/* Descrição */}
          {p.description && (
            <div className="p-4 bg-[#111111] rounded-xl border border-[#2a2a2a] mb-6">
              <p className="text-[#d1d5db] text-sm leading-relaxed">{p.description}</p>
            </div>
          )}

          {/* Seletor de tamanho + botão (client component) */}
          <ProductActionsClient product={p} />

          {/* Botão WhatsApp */}
          <a
            href={getWhatsAppLink(whatsappMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-[#25D366] text-[#25D366] font-bold hover:bg-[#25D366] hover:text-black transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            Perguntar no WhatsApp
          </a>

          {/* Garantias */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
              <Shield className="w-4 h-4 text-[#b2ea0f] shrink-0" />
              Compra 100% segura
            </div>
            <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
              <Truck className="w-4 h-4 text-[#b2ea0f] shrink-0" />
              Envio rápido
            </div>
          </div>
        </div>
      </div>

      {/* Avaliações */}
      <section className="mb-16">
        <h2 className="text-xl font-black text-white uppercase mb-6">Avaliações dos Clientes</h2>

        {approvedReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {approvedReviews.map(r => (
              <div key={r.id} className="p-4 bg-[#111111] rounded-xl border border-[#2a2a2a]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-[#b2ea0f] text-[#b2ea0f]' : 'text-[#2a2a2a]'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-[#b2ea0f] font-semibold">
                    {['','Muito ruim','Ruim','Regular','Bom','Muito bom'][r.rating]}
                  </span>
                </div>
                {r.comment && <p className="text-sm text-[#d1d5db] mb-2">"{r.comment}"</p>}
                <p className="text-xs font-semibold text-[#9ca3af]">{r.customer_name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#9ca3af] text-sm mb-8">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
        )}

        <ReviewForm productId={p.id} />
      </section>

      {/* Produtos relacionados */}
      {related && related.length > 0 && (
        <section>
          <h2 className="text-xl font-black text-white uppercase mb-6">Você também pode gostar</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map(rp => (
              <ProductCard key={rp.id} product={rp as unknown as Product} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// Inline client component para ações (tamanho + qty + botão)
import ProductActionsClient from '@/components/store/ProductActionsClient'
import ReviewForm from '@/components/store/ReviewForm'
