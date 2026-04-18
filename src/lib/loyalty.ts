import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Processa os pontos de fidelidade de um pedido aprovado.
 * Vinculado ao user_id do pedido — independente de telefone ou formato.
 * 1 ponto = R$ 1,00 gasto. Pontos podem ser usados como desconto no checkout.
 * Idempotente: a flag points_processed impede processamento duplicado.
 */
export async function processLoyaltyPoints(
  orderId: string,
  supabase: SupabaseClient,
) {
  // Buscar pedido incluindo user_id
  const { data: pedido } = await supabase
    .from('orders')
    .select('id, order_number, user_id, customer_phone, customer_name, customer_email, total, points_to_use, points_earned, points_processed')
    .eq('id', orderId)
    .single()

  if (!pedido) return
  if (pedido.points_processed) {
    // Verificar se os pontos foram de fato creditados
    const { data: txExistente } = await supabase
      .from('loyalty_transactions')
      .select('id')
      .ilike('description', `%${pedido.order_number}%`)
      .limit(1)
      .maybeSingle()
    if (txExistente) return // já processado com sucesso
    // Caso contrário: reprocessa (execução anterior falhou após marcar a flag)
  }

  // Sem user_id não conseguimos vincular à conta — logar e sair
  if (!pedido.user_id) {
    console.warn(`[loyalty] Pedido ${pedido.order_number} sem user_id — pontos não creditados`)
    return
  }

  const toDeduct = pedido.points_to_use || 0
  const toEarn   = pedido.points_earned || Math.floor(pedido.total)  // 1 ponto por real gasto

  // Buscar conta pelo user_id (forma correta e confiável)
  const { data: acc } = await supabase
    .from('loyalty_accounts')
    .select('id, points, total_spent')
    .eq('user_id', pedido.user_id)
    .maybeSingle()

  let accountId: string | null = null

  if (acc) {
    const { error: updErr } = await supabase
      .from('loyalty_accounts')
      .update({
        points:      Math.max(0, acc.points - toDeduct) + toEarn,
        total_spent: acc.total_spent + pedido.total,
      })
      .eq('id', acc.id)

    if (updErr) { console.error('[loyalty] Erro ao atualizar conta:', updErr.message); return }
    accountId = acc.id
  } else {
    const phone = (pedido.customer_phone ?? '').replace(/\D/g, '')
    const { data: newAcc, error: insErr } = await supabase
      .from('loyalty_accounts')
      .insert({
        user_id:        pedido.user_id,
        customer_phone: phone || null,
        customer_name:  pedido.customer_name,
        customer_email: pedido.customer_email || null,
        points:         toEarn,
        total_spent:    pedido.total,
      })
      .select('id')
      .single()

    if (insErr || !newAcc) { console.error('[loyalty] Erro ao criar conta:', insErr?.message); return }
    accountId = newAcc.id
  }

  // Registrar transações
  const txInserts = []
  if (toDeduct > 0) {
    txInserts.push(supabase.from('loyalty_transactions').insert({
      account_id:  accountId,
      points:     -toDeduct,
      type:        'redeem',
      description: `Resgate no pedido ${pedido.order_number}`,
    }))
  }
  if (toEarn > 0) {
    txInserts.push(supabase.from('loyalty_transactions').insert({
      account_id:  accountId,
      points:      toEarn,
      type:        'earn',
      description: `Pontos do pedido ${pedido.order_number}`,
    }))
  }
  if (txInserts.length > 0) await Promise.all(txInserts)

  // Marcar como processado SOMENTE após tudo ter funcionado
  await supabase.from('orders').update({ points_processed: true }).eq('id', orderId)
}
