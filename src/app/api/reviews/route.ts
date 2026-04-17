import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // Requer usuário autenticado
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'É necessário estar logado para avaliar.' }, { status: 401 })
    }

    const body = await req.json()
    const { product_id, rating, comment } = body

    if (!product_id || !rating) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }

    const ratingNum = Number(rating)
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Avaliação inválida.' }, { status: 400 })
    }

    const service = createServiceClient()

    // Busca o nome do perfil do usuário
    const { data: perfil } = await service
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const customer_name = perfil?.full_name?.trim() || user.email || 'Anônimo'

    // Valida que o produto existe
    const { data: product } = await service
      .from('products')
      .select('id')
      .eq('id', product_id)
      .eq('active', true)
      .single()

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
    }

    const { error } = await service.from('reviews').insert({
      product_id,
      customer_name,
      rating: ratingNum,
      comment: comment?.trim().slice(0, 1000) || null,
      approved: false,
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro ao enviar avaliação.' }, { status: 500 })
  }
}
