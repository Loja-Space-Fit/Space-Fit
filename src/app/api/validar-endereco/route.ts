import { NextRequest, NextResponse } from 'next/server'

// Valida endereço via Nominatim (OpenStreetMap) — gratuito, sem chave API.
// Nominatim exige User-Agent identificado; por isso a chamada é server-side.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const street       = searchParams.get('street')       ?? ''
  const number       = searchParams.get('number')       ?? ''
  const neighborhood = searchParams.get('neighborhood') ?? ''
  const city         = searchParams.get('city')         ?? ''
  const state        = searchParams.get('state')        ?? ''

  if (!street || !city || !state) {
    return NextResponse.json({ valid: false, reason: 'Dados insuficientes' }, { status: 400 })
  }

  // Sanidade básica: nome de rua ou bairro com menos de 3 letras reais é inválido
  const letras = (s: string) => s.replace(/[^a-zA-ZÀ-ú]/g, '')
  if (letras(street).length < 3) {
    return NextResponse.json({ valid: false, reason: 'Nome de rua inválido' })
  }
  if (letras(neighborhood).length < 3) {
    return NextResponse.json({ valid: false, reason: 'Nome de bairro inválido' })
  }
  // Número deve conter ao menos um dígito
  if (!/\d/.test(number)) {
    return NextResponse.json({ valid: false, reason: 'Número inválido' })
  }

  // Monta query: "Número Rua, Bairro, Cidade, Estado, Brasil"
  const query = [
    number ? `${number} ${street}` : street,
    neighborhood,
    city,
    state,
    'Brasil',
  ].filter(Boolean).join(', ')

  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=br&limit=5&addressdetails=1`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'SpaceFit/1.0 (loja fitness brasileira)',
        'Accept-Language': 'pt-BR',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      // Nominatim indisponível — não bloqueia o usuário
      return NextResponse.json({ valid: true, reason: 'Serviço indisponível — endereço não verificado' })
    }

    const results: Array<{
      address?: {
        road?: string
        pedestrian?: string
        footway?: string
        path?: string
        city?: string
        town?: string
        municipality?: string
        state?: string
      }
    }> = await res.json()

    if (!results.length) {
      return NextResponse.json({ valid: false, reason: 'Endereço não encontrado' })
    }

    const streetNorm = normalize(street)

    // Exige que ao menos um resultado tenha uma VIA (road/pedestrian/etc)
    // cujo nome seja similar ao informado pelo usuário.
    // Isso impede que resultados genéricos da cidade passem.
    const matched = results.some(r => {
      const addr = r.address ?? {}
      const returnedRoad = normalize(
        addr.road ?? addr.pedestrian ?? addr.footway ?? addr.path ?? ''
      )
      if (!returnedRoad) return false

      // Remove prefixos comuns (Rua, Avenida, Av, R, etc.) antes de comparar
      const stripPrefix = (s: string) =>
        s.replace(/^(rua|r\.|av\.|avenida|alameda|al\.|travessa|tv\.|estrada|est\.?)\s+/i, '').trim()

      const a = stripPrefix(returnedRoad)
      const b = stripPrefix(streetNorm)

      return a.includes(b) || b.includes(a)
    })

    return NextResponse.json({
      valid: matched,
      reason: matched ? 'ok' : 'Rua não encontrada nesse endereço. Verifique o nome da rua e o número.',
    })
  } catch {
    // Em caso de erro de rede, não bloqueia o pedido
    return NextResponse.json({ valid: true, reason: 'Serviço indisponível — endereço não verificado' })
  }
}
