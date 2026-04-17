import { createClient } from '@/lib/supabase/server'
import type { Bundle, BundleItem } from '@/types'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { formatBRL } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Kits & Combos | Space Fit',
  description: 'Kits e combos especiais com o melhor custo-benefício para o seu treino.',
}

interface BundleWithItems extends Bundle {
  bundle_items: (BundleItem & { product: { name: string; price: number } | null })[]
}

export default async function KitsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('bundles')
    .select('*, bundle_items(id, quantity, product:products(name, price))')
    .eq('active', true)
    .order('created_at', { ascending: false })

  const bundles = (data || []) as unknown as BundleWithItems[]

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
          Kits &amp; <span className="text-[#b2ea0f]">Combos</span>
        </h1>
        <p className="text-[#9ca3af] mt-2">Conjuntos especiais com o melhor custo-benefício para o seu treino.</p>
        <p className="text-[#b2ea0f] text-sm font-semibold mt-1">
          {bundles.length} kit{bundles.length !== 1 ? 's' : ''} disponível{bundles.length !== 1 ? 'eis' : ''}
        </p>
      </div>

      {bundles.length === 0 ? (
        <div className="py-24 text-center text-[#9ca3af]">
          <Package className="w-16 h-16 mx-auto mb-4 text-[#333]" />
          <p className="text-lg">Nenhum kit disponível no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bundles.map(bundle => {
            const itemTotal = bundle.bundle_items?.reduce(
              (s, i) => s + (i.product?.price || 0) * i.quantity, 0
            ) || 0
            const discountPct = itemTotal > bundle.price
              ? Math.round((1 - bundle.price / itemTotal) * 100)
              : 0

            return (
              <Link
                key={bundle.id}
                href={`/kits/${bundle.slug}`}
                className="group bg-[#111111] border border-[#2a2a2a] hover:border-[#b2ea0f]/40 rounded-2xl overflow-hidden transition-all duration-200"
              >
                {/* Imagem */}
                <div className="relative h-52 bg-[#1a1a1a]">
                  {bundle.image_url ? (
                    <Image
                      src={bundle.image_url}
                      alt={bundle.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-16 h-16 text-[#333]" />
                    </div>
                  )}
                  {discountPct > 0 && (
                    <span className="absolute top-3 left-3 bg-[#b2ea0f] text-black text-xs font-black px-2 py-1 rounded-full">
                      -{discountPct}% OFF
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-5">
                  <h2 className="font-black text-white text-lg mb-1 group-hover:text-[#b2ea0f] transition-colors">
                    {bundle.name}
                  </h2>
                  {bundle.description && (
                    <p className="text-sm text-[#9ca3af] mb-3 line-clamp-2">{bundle.description}</p>
                  )}

                  {/* Produtos incluídos */}
                  {bundle.bundle_items && bundle.bundle_items.length > 0 && (
                    <ul className="space-y-1 mb-4">
                      {bundle.bundle_items.slice(0, 3).map(item => (
                        <li key={item.id} className="text-xs text-[#9ca3af] flex items-center gap-1.5">
                          <Package className="w-3 h-3 text-[#b2ea0f] shrink-0" />
                          {item.product?.name} × {item.quantity}
                        </li>
                      ))}
                      {bundle.bundle_items.length > 3 && (
                        <li className="text-xs text-[#555]">+{bundle.bundle_items.length - 3} produto{bundle.bundle_items.length - 3 !== 1 ? 's' : ''} mais</li>
                      )}
                    </ul>
                  )}

                  {/* Preço */}
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-black text-white">{formatBRL(bundle.price)}</span>
                    {itemTotal > bundle.price && (
                      <span className="text-sm text-[#555] line-through mb-0.5">{formatBRL(itemTotal)}</span>
                    )}
                  </div>
                  {itemTotal > bundle.price && (
                    <p className="text-xs text-[#b2ea0f] font-semibold mt-0.5">
                      Economia de {formatBRL(itemTotal - bundle.price)}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
