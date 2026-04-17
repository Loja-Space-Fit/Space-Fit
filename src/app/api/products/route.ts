import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE_MAX = 48
const PAGE_SIZE_DEFAULT = 12

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('categoryId')
  const q          = (searchParams.get('q') || '').trim()
  const sort       = searchParams.get('sort') || 'featured'
  const page       = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize   = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(searchParams.get('pageSize') || String(PAGE_SIZE_DEFAULT))))

  if (!categoryId) {
    return NextResponse.json({ error: 'categoryId obrigatório' }, { status: 400 })
  }

  const supabase = await createClient()
  const from = (page - 1) * pageSize
  const to   = from + pageSize - 1

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('category_id', categoryId)
    .eq('active', true)

  if (q) query = query.ilike('name', `%${q}%`)

  switch (sort) {
    case 'newest':     query = query.order('created_at', { ascending: false }); break
    case 'price_asc':  query = query.order('price',      { ascending: true  }); break
    case 'price_desc': query = query.order('price',      { ascending: false }); break
    default:
      query = query.order('featured', { ascending: false }).order('created_at', { ascending: false })
  }

  const { data: products, count, error } = await query.range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const totalPages = Math.ceil((count || 0) / pageSize)

  return NextResponse.json(
    { products: products ?? [], count: count ?? 0, totalPages },
    {
      headers: {
        // Sem cache — dados de estoque precisam ser frescos
        'Cache-Control': 'no-store',
      },
    }
  )
}
