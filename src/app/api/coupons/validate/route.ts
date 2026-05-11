import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Coupon } from '@/types'

// Rate limiting: 20 tentativas por IP por minuto
const rl = new Map<string, { count: number; resetAt: number }>()
function rateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rl.get(ip)
  if (!entry || now > entry.resetAt) {
    rl.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 20) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde um momento.' }, { status: 429 })
  }

  try {
    const { code, subtotal } = await req.json()

    if (!code) {
      return NextResponse.json({ error: 'Código de cupom obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single()

    if (!coupon) {
      return NextResponse.json({ error: 'Cupom inválido ou expirado' }, { status: 404 })
    }

    const now = new Date()
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return NextResponse.json({ error: 'Este cupom expirou' }, { status: 400 })
    }

    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      return NextResponse.json({ error: 'Este cupom atingiu o limite de usos' }, { status: 400 })
    }

    if (subtotal < coupon.min_order) {
      return NextResponse.json({
        error: `Pedido mínimo de R$ ${coupon.min_order.toFixed(2).replace('.', ',')} para usar este cupom`
      }, { status: 400 })
    }

    return NextResponse.json({ coupon: coupon as Coupon })
  } catch {
    return NextResponse.json({ error: 'Erro ao validar cupom' }, { status: 500 })
  }
}
