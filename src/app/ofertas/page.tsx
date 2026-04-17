import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import type { Product } from '@/types'
import ProductCard from '@/components/store/ProductCard'
import { Tag } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Ofertas | Space Fit',
  description: 'Produtos com desconto na Space Fit. Aproveite as melhores ofertas em roupas, suplementos e acessórios fitness.',
}

export const revalidate = 60

export default async function OfertasPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .not('compare_price', 'is', null)
    .gt('compare_price', 0)
    .order('created_at', { ascending: false })

  // Filtra apenas produtos onde compare_price > price (desconto real)
  const products = ((data || []) as Product[]).filter(
    p => p.compare_price && p.compare_price > p.price
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Cabeçalho */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-5 h-5 text-[#b2ea0f]" />
          <span className="text-[#b2ea0f] text-sm font-bold uppercase tracking-widest">Promoções</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
          Nossas <span className="text-[#b2ea0f]">Ofertas</span>
        </h1>
        <p className="text-[#9ca3af] mt-2">Produtos com desconto especial para você treinar mais gastando menos.</p>
        {products.length > 0 && (
          <p className="text-[#b2ea0f] text-sm font-semibold mt-1">
            {products.length} produto{products.length !== 1 ? 's' : ''} em oferta
          </p>
        )}
      </div>

      {products.length === 0 ? (
        <div className="py-24 text-center">
          <Tag className="w-16 h-16 mx-auto mb-4 text-[#333]" />
          <p className="text-lg text-[#9ca3af]">Nenhuma oferta disponível no momento.</p>
          <p className="text-sm text-[#555] mt-1">Volte em breve — novas promoções aparecem por aqui!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(product => (
            <ProductCard key={product.id} product={product as unknown as Product} />
          ))}
        </div>
      )}
    </div>
  )
}
