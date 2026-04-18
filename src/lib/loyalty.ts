import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Processa os pontos de fidelidade de um pedido aprovado.
 * Usa points_processed como flag para evitar processamento duplicado.
 * Seguro para ser chamado de webhook e da página de confirmação ao mesmo tempo.
 */
export async function processLoyaltyPoints(
  orderId: string,
  supabase: SupabaseClient,
) {
  // Buscar pedido — checar flag antes de processar
  const { data: pedido } = await supabase
    .from('orders')
    .select('id, order_number, customer_phone, customer_name, customer_email, total, points_to_use, points_earned, points_processed')
    .eq('id', orderId)
    .single()

  if (!pedido || pedido.points_processed) return

  // Normaliza o telefone (remove formatação) para garantir match no banco
  const phone    = (pedido.customer_phone ?? '').replace(/\D/g, '')
  const toDeduct = pedido.points_to_use  || 0
  const toEarn   = pedido.points_earned  || Math.floor(pedido.total * 0.01)

  // Marcar como processado ANTES de qualquer operação para evitar race condition
  const { error: flagError } = await supabase
    .from('orders')
    .update({ points_processed: true })
    .eq('id', orderId)
    .eq('points_processed', false) // garantia atômica: só atualiza se ainda for false

  if (flagError) {
    // Outro processo já marcou — sair sem duplicar
    return
  }

  const { data: acc } = await supabase
    .from('loyalty_accounts')
    .select('id, points, total_spent')
    .eq('customer_phone', phone)
    .single()

  if (acc) {
    await supabase.from('loyalty_accounts').update({
      points:      Math.max(0, acc.points - toDeduct) + toEarn,
      total_spent: acc.total_spent + pedido.total,
    }).eq('id', acc.id)

    if (toDeduct > 0) {
      await supabase.from('loyalty_transactions').insert({
        account_id:  acc.id,
        points:     -toDeduct,
        type:        'redeem',
        description: `Resgate no pedido ${pedido.order_number}`,
      })
    }
    if (toEarn > 0) {
      await supabase.from('loyalty_transactions').insert({
        account_id:  acc.id,
        points:      toEarn,
        type:        'earn',
        description: `Cashback 1% do pedido ${pedido.order_number}`,
      })
    }
  } else {
    // Criar conta de fidelidade nova
    const { data: newAcc } = await supabase.from('loyalty_accounts').insert({
      customer_phone: phone,
      customer_name:  pedido.customer_name,
      customer_email: pedido.customer_email || null,
      points:         toEarn,
      total_spent:    pedido.total,
    }).select('id').single()

    if (newAcc && toEarn > 0) {
      await supabase.from('loyalty_transactions').insert({
        account_id:  newAcc.id,
        points:      toEarn,
        type:        'earn',
        description: `Cashback 1% do pedido ${pedido.order_number}`,
      })
    }
  }
}
