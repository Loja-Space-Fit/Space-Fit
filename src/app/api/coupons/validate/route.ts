import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Coupon } from '@/types'

export async function POST(req: NextRequest) {
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
