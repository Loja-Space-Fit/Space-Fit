import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const uf = req.nextUrl.searchParams.get('uf')?.toUpperCase()
  const subtotal = parseFloat(req.nextUrl.searchParams.get('subtotal') || '0')

  if (!uf || uf.length !== 2) {
    return NextResponse.json({ error: 'UF inválida' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const [{ data: rate }, { data: settings }] = await Promise.all([
    supabase.from('shipping_rates').select('*').eq('uf', uf).single(),
    supabase.from('store_settings').select('key, value').in('key', ['free_shipping_threshold']),
  ])

  const threshold = parseFloat(
    settings?.find((s: { key: string; value: string }) => s.key === 'free_shipping_threshold')?.value || '299'
  )

  if (!rate) {
    // UF não encontrada — usa taxa padrão
    return NextResponse.json({
      price: 35.90,
      free: false,
      min_days: 7,
      max_days: 14,
      threshold,
    })
  }

  return NextResponse.json({
    price: rate.price,
    original_price: rate.price,
    free: false,
    min_days: rate.min_days,
    max_days: rate.max_days,
    threshold,
    uf: rate.uf,
    state_name: rate.state_name,
  })
}
