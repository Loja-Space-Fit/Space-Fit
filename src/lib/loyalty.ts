import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Processa os pontos de fidelidade de um pedido aprovado.
 * Idempotente: verifica points_processed E a existência da transação no banco.
 * A flag só é marcada como true DEPOIS que os pontos forem efetivamente creditados.
 */
export async function processLoyaltyPoints(
  orderId: string,
  supabase: SupabaseClient,
) {
  // Buscar pedido
  const { data: pedido } = await supabase
    .from('orders')
    .select('id, order_number, customer_phone, customer_name, customer_email, total, points_to_use, points_earned, points_processed')
    .eq('id', orderId)
    .single()

  if (!pedido) return

  // Normaliza o telefone (remove formatação) para garantir match no banco
  const phone    = (pedido.customer_phone ?? '').replace(/\D/g, '')
  const toDeduct = pedido.points_to_use  || 0
  const toEarn   = pedido.points_earned  || Math.floor(pedido.total * 0.01)

  // Se points_processed já é true, verificar se a transação de fato existe no banco.
  // Isso evita que uma execução parcial (flag=true mas pontos não creditados) bloqueie tudo.
  if (pedido.points_processed) {
    const { data: txExistente } = await supabase
      .from('loyalty_transactions')
      .select('id')
      .ilike('description', `%${pedido.order_number}%`)
      .limit(1)
      .maybeSingle()

    if (txExistente) return // pontos já foram creditados de verdade
    // Caso contrário: flag marcada mas pontos não creditados — reprocessa
  }

  // Buscar ou criar conta de fidelidade
  const { data: acc } = await supabase
    .from('loyalty_accounts')
    .select('id, points, total_spent')
    .eq('customer_phone', phone)
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

    if (updErr) {
      console.error('[loyalty] Erro ao atualizar conta:', updErr.message)
      return
    }
    accountId = acc.id
  } else {
    const { data: newAcc, error: insErr } = await supabase
      .from('loyalty_accounts')
      .insert({
        customer_phone: phone,
        customer_name:  pedido.customer_name,
        customer_email: pedido.customer_email || null,
        points:         toEarn,
        total_spent:    pedido.total,
      })
      .select('id')
      .single()

    if (insErr || !newAcc) {
      console.error('[loyalty] Erro ao criar conta:', insErr?.message)
      return
    }
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
      description: `Cashback 1% do pedido ${pedido.order_number}`,
    }))
  }
  if (txInserts.length > 0) await Promise.all(txInserts)

  // Marcar como processado SOMENTE após os pontos serem creditados com sucesso
  await supabase
    .from('orders')
    .update({ points_processed: true })
    .eq('id', orderId)
}
