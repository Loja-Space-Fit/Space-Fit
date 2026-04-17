import { createClient } from '@/lib/supabase/server'
import type { Bundle, BundleItem } from '@/types'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Package, ArrowLeft, ShoppingCart } from 'lucide-react'
import { formatBRL } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

interface ProductRef {
  name: string
  price: number
  images: string[]
  slug: string
}

type BundleItemFull = Omit<BundleItem, 'product'> & {
  product: ProductRef | null
}

interface BundleDetail extends Bundle {
  images: string[]
  bundle_items: BundleItemFull[]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('bundles').select('name, description').eq('slug', slug).single()
  if (!data) return { title: 'Kit' }
  return {
    title: `${data.name} | Space Fit`,
    description: data.description || `Kit ${data.name} na Space Fit`,
  }
}

export default async function KitDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('bundles')
    .select('*, bundle_items(id, product_id, quantity, product:products(name, price, images, slug))')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!data) notFound()

  const bundle = data as unknown as BundleDetail
  const images: string[] = bundle.images?.length ? bundle.images : bundle.image_url ? [bundle.image_url] : []
  const itemTotal = bundle.bundle_items?.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0) || 0
  const savings = itemTotal > bundle.price ? itemTotal - bundle.price : 0
  const discountPct = itemTotal > bundle.price ? Math.round((1 - bundle.price / itemTotal) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Voltar */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-white transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Galeria de imagens */}
        <div className="space-y-3">
          {images.length > 0 ? (
            <>
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a]">
                <Image src={images[0]} alt={bundle.name} fill className="object-cover" priority />
                {discountPct > 0 && (
                  <span className="absolute top-4 left-4 bg-[#b2ea0f] text-black text-sm font-black px-3 py-1 rounded-full">
                    -{discountPct}% OFF
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-3">
                  {images.slice(1).map((url, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a] shrink-0">
                      <Image src={url} alt={`${bundle.name} ${i + 2}`} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full aspect-square rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
              <Package className="w-24 h-24 text-[#333]" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-3">
            {bundle.name}
          </h1>
          {bundle.description && (
            <p className="text-[#9ca3af] mb-6">{bundle.description}</p>
          )}

          {/* Preço */}
          <div className="mb-6">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-white">{formatBRL(bundle.price)}</span>
              {itemTotal > bundle.price && (
                <span className="text-xl text-[#555] line-through mb-1">{formatBRL(itemTotal)}</span>
              )}
            </div>
            {savings > 0 && (
              <p className="text-[#b2ea0f] font-semibold mt-1">
                Você economiza {formatBRL(savings)} comprando o kit completo
              </p>
            )}
          </div>

          {/* Produtos incluídos */}
          {bundle.bundle_items && bundle.bundle_items.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-[#9ca3af] uppercase tracking-widest mb-3">
                O que está incluído
              </h2>
              <div className="space-y-2">
                {bundle.bundle_items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-[#111111] border border-[#2a2a2a] rounded-xl p-3">
                    {item.product?.images?.[0] ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#1a1a1a] shrink-0">
                        <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#1a1a1a] flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-[#555]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{item.product?.name}</p>
                      <p className="text-xs text-[#9ca3af]">{formatBRL(item.product?.price || 0)} × {item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-[#b2ea0f] shrink-0">
                      {item.quantity}×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#b2ea0f] hover:bg-[#c8f040] text-black font-black text-lg transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Adicionar ao Carrinho — {formatBRL(bundle.price)}
          </button>
        </div>
      </div>
    </div>
  )
}
