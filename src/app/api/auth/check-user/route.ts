import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Rate limiting: 10 requisições por IP por minuto
const rl = new Map<string, { count: number; resetAt: number }>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rl.get(ip)
  if (!entry || now > entry.resetAt) {
    rl.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

function isPhoneInput(s: string): boolean {
  const digits = s.replace(/\D/g, '')
  return digits.length >= 7 && /^[\d\s().+\-]+$/.test(s.trim())
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { exists: false, email: null, error: 'Muitas tentativas. Aguarde um momento.' },
      { status: 429 }
    )
  }

  try {
    const { identifier } = await req.json()
    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ exists: false, email: null })
    }

    const supabase = createServiceClient()

    if (isPhoneInput(identifier)) {
      const digits = identifier.replace(/\D/g, '')

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, phone')
        .not('phone', 'is', null)

      const match = (profiles ?? []).find((p: { id: string; email: string | null; phone: string | null }) => {
        const stored = (p.phone ?? '').replace(/\D/g, '')
        return stored === digits || stored.endsWith(digits.slice(-9))
      })

      return NextResponse.json({ exists: !!match, email: match?.email ?? null })
    } else {
      const email = identifier.toLowerCase().trim()
      const { data } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle()

      return NextResponse.json({ exists: !!data, email: data?.email ?? null })
    }
  } catch {
    return NextResponse.json({ exists: false, email: null }, { status: 500 })
  }
}
