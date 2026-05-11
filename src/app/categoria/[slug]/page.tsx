import { createClient } from '@/lib/supabase/server'
import type { Product, Category, Bundle, BundleItem } from '@/types'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Package, ChevronRight, Home } from 'lucide-react'
import { formatBRL } from '@/lib/utils'
import { Suspense } from 'react'
import CategoryControls from '@/components/store/CategoryControls'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: cat } = await supabase
    .from('categories').select('name, description').eq('slug', slug).single()
  if (!cat) return { title: 'Categoria' }
  return {
    title: cat.name,
    description: cat.description || `Produtos de ${cat.name} na Space Fit`,
  }
}

interface BundleWithItems extends Bundle {
  bundle_items?: (BundleItem & { product: { name: string; price: number } | null })[]
}

export default async function CategoryPage({ params, searchParams: spPromise }: Props) {
  const { slug } = await params
  const sp = await spPromise
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories').select('*').eq('slug', slug).eq('active', true).single()

  if (!category) notFound()

  // Categoria de Kits & Combos: exibe bundles em vez de produtos
  if (category.is_bundle_category) {
    const { data: bundles } = await supabase
      .from('bundles')
      .select('*, bundle_items(id, product_id, quantity, product:products(name, price))')
      .eq('active', true)
      .order('created_at', { ascending: false })

    const list = (bundles || []) as unknown as BundleWithItems[]

    return (
      <div>
        {/* Header da categoria (sem imagem) */}
        <div className="bg-[#111111] border-b border-[#2a2a2a]">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
            <div className="flex items-center gap-1.5 text-xs text-[#9ca3af] mb-3">
              <Link href="/" className="hover:text-[#b2ea0f] transition-colors flex items-center gap-1">
                <Home className="w-3 h-3" /> Início
              </Link>
              <ChevronRight className="w-3 h-3 text-[#555]" />
              <span className="text-[#b2ea0f] font-bold">{category.name}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-[#9ca3af] mt-2 text-sm max-w-md">{category.description}</p>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-[#b2ea0f] text-sm font-semibold mb-6">
            {list.length} kit{list.length !== 1 ? 's' : ''} disponív{list.length !== 1 ? 'eis' : 'el'}
          </p>

        {!list.length ? (
          <div className="py-20 text-center text-[#9ca3af]">
            <p className="text-lg">Nenhum kit disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map(bundle => {
              const itemTotal = bundle.bundle_items?.reduce(
                (s, i) => s + (i.product?.price || 0) * i.quantity, 0
              ) || 0
              return (
                <Link
                  key={bundle.id}
                  href={`/kits/${bundle.slug}`}
                  className="group bg-[#111111] border border-[#2a2a2a] hover:border-[#b2ea0f]/40 rounded-2xl overflow-hidden transition-all duration-200"
                >
                  {/* Imagem */}
                  <div className="relative h-48 bg-[#1a1a1a]">
                    {bundle.image_url ? (
                      <Image src={bundle.image_url} alt={bundle.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package className="w-16 h-16 text-[#333]" />
                      </div>
                    )}
                    {itemTotal > bundle.price && (
                      <span className="absolute top-3 left-3 bg-[#b2ea0f] text-black text-xs font-black px-2 py-1 rounded-full">
                        -{Math.round((1 - bundle.price / itemTotal) * 100)}% OFF
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="font-black text-white text-lg mb-1 group-hover:text-[#b2ea0f] transition-colors">
                      {bundle.name}
                    </h3>
                    {bundle.description && (
                      <p className="text-sm text-[#9ca3af] mb-3 line-clamp-2">{bundle.description}</p>
                    )}

                    {/* Produtos do kit */}
                    {bundle.bundle_items && bundle.bundle_items.length > 0 && (
                      <ul className="space-y-1 mb-4">
                        {bundle.bundle_items.map(item => (
                          <li key={item.id} className="text-xs text-[#9ca3af] flex items-center gap-1.5">
                            <Package className="w-3 h-3 text-[#b2ea0f] shrink-0" />
                            {item.product?.name} × {item.quantity}
                          </li>
                        ))}
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
                        Você economiza {formatBRL(itemTotal - bundle.price)}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
        </div>
      </div>
    )
  }

  // Categoria normal: exibe produtos com busca, ordenação e paginação
  // SSR carrega a primeira página com os parâmetros da URL (SEO + first load correto).
  // Mudanças subsequentes de filtro/sort/página são client-side via API route.
  const PAGE_SIZE = 12
  const page = Math.max(1, parseInt(sp.page || '1'))
  const q    = (sp.q || '').trim()
  const sort = sp.sort || 'featured'
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('category_id', category.id)
    .eq('active', true)

  if (q) query = query.ilike('name', `%${q}%`)

  switch (sort) {
    case 'newest':    query = query.order('created_at', { ascending: false }); break
    case 'price_asc': query = query.order('price', { ascending: true }); break
    case 'price_desc': query = query.order('price', { ascending: false }); break
    default:
      query = query.order('featured', { ascending: false }).order('created_at', { ascending: false })
  }

  const { data: products, count } = await query.range(from, to)

  return (
    <div>
      {/* Header da categoria (sem imagem) */}
      <div className="bg-[#111111] border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-[#9ca3af] mb-3">
            <Link href="/" className="hover:text-[#b2ea0f] transition-colors flex items-center gap-1">
              <Home className="w-3 h-3" /> Início
            </Link>
            <ChevronRight className="w-3 h-3 text-[#555]" />
            <span className="text-[#b2ea0f] font-bold">{category.name}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-[#9ca3af] mt-2 text-sm max-w-md">{category.description}</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
      <Suspense fallback={<div className="h-12 bg-[#111111] rounded-xl animate-pulse mb-6" />}>
        <CategoryControls
          categoryId={category.id}
          initialProducts={(products ?? []) as unknown as import('@/types').Product[]}
          initialCount={count ?? 0}
          initialPage={page}
          initialSort={sort}
          initialQ={q}
        />
      </Suspense>
      </div>
    </div>
  )
}
