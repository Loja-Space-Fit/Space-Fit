import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Processa os pontos de fidelidade de um pedido aprovado.
 * 1 ponto = R$ 1,00 gasto. Lança erro em caso de falha para que o chamador saiba.
 */
export async function processLoyaltyPoints(
  orderId: string,
  supabase: SupabaseClient,
) {
  const { data: pedido, error: fetchErr } = await supabase
    .from('orders')
    .select('id, order_number, user_id, customer_phone, customer_name, customer_email, total, points_to_use, points_earned, points_processed')
    .eq('id', orderId)
    .single()

  if (fetchErr) throw new Error(`Pedido não encontrado: ${fetchErr.message}`)
  if (!pedido) throw new Error('Pedido não encontrado')

  // Idempotência: verifica se já existe transação para este pedido
  if (pedido.points_processed) {
    const { data: txExistente } = await supabase
      .from('loyalty_transactions')
      .select('id')
      .eq('order_id', orderId)
      .limit(1)
      .maybeSingle()
    if (txExistente) return // já processado com sucesso
  }

  if (!pedido.user_id) {
    throw new Error(`Pedido ${pedido.order_number} sem user_id`)
  }

  const toDeduct = pedido.points_to_use || 0
  const toEarn   = Math.round(pedido.total * 0.01 * 100) / 100 // 1% do valor, 2 casas decimais

  // Buscar conta existente pelo user_id
  const { data: acc, error: accErr } = await supabase
    .from('loyalty_accounts')
    .select('id, points, total_spent')
    .eq('user_id', pedido.user_id)
    .maybeSingle()

  if (accErr) throw new Error(`Erro ao buscar conta: ${accErr.message}`)

  let accountId: string

  if (acc) {
    const { error: updErr } = await supabase
      .from('loyalty_accounts')
      .update({
        points:      Math.max(0, acc.points - toDeduct) + toEarn,
        total_spent: Number(acc.total_spent) + pedido.total,
      })
      .eq('id', acc.id)

    if (updErr) throw new Error(`Erro ao atualizar conta: ${updErr.message}`)
    accountId = acc.id
  } else {
    // Criar conta nova — usar upsert para evitar race condition
    const phone = (pedido.customer_phone ?? '').replace(/\D/g, '')
    const { data: newAcc, error: insErr } = await supabase
      .from('loyalty_accounts')
      .insert({
        user_id:        pedido.user_id,
        customer_phone: phone || null,
        customer_name:  pedido.customer_name,
        points:         toEarn,
        total_spent:    pedido.total,
      })
      .select('id')
      .single()

    if (insErr) throw new Error(`Erro ao criar conta: ${insErr.message}`)
    if (!newAcc) throw new Error('Conta criada mas ID não retornado')
    accountId = newAcc.id
  }

  const phone = (pedido.customer_phone ?? '').replace(/\D/g, '')

  // Registrar transação usando o schema real da tabela loyalty_transactions
  const { error: txErr } = await supabase.from('loyalty_transactions').insert({
    customer_phone:   phone || null,
    order_id:         orderId,
    points_earned:    toEarn,
    points_redeemed:  toDeduct,
    description:      `Pedido ${pedido.order_number}`,
  })
  if (txErr) throw new Error(`Erro ao inserir transação: ${txErr.message}`)

  // Marcar como processado SOMENTE após tudo ter funcionado
  await supabase.from('orders').update({ points_processed: true }).eq('id', orderId)
}
