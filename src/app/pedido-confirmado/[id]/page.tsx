import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatBRL, getWhatsAppLink, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/utils'
import { processLoyaltyPoints } from '@/lib/loyalty'
import { getPaymentClient } from '@/lib/mercadopago'
import { enviarEmailConfirmacaoPedido } from '@/lib/email'
import { CheckCircle, XCircle, Clock, QrCode, MessageCircle, ShoppingBag, Package, CreditCard } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Order } from '@/types'
import PaymentStatusPoller from '@/components/store/PaymentStatusPoller'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams

  // Parâmetros enviados pelo Mercado Pago na URL de retorno
  const mpPaymentId = String(sp.payment_id ?? sp.collection_id ?? '')
  const mpResult    = String(sp.mp_result ?? '')

  // Quando temos um payment_id, consultar a API do MP diretamente para obter o status real.
  // O MP frequentemente redireciona PIX com ?status=pending mesmo após pagamento aprovado.
  let mpRealStatus = String(sp.status ?? sp.collection_status ?? '')
  if (mpPaymentId && mpPaymentId !== 'undefined') {
    try {
      const paymentClient = getPaymentClient()
      const payment = await paymentClient.get({ id: Number(mpPaymentId) })
      if (payment?.status) mpRealStatus = payment.status
    } catch { /* usa o status da URL como fallback */ }
  }

  const service = createServiceClient()

  // Atualizar o pedido no banco com o status real do MP
  if (mpRealStatus && mpPaymentId && mpPaymentId !== 'undefined') {
    if (mpRealStatus === 'approved') {
      const { data: wasAlreadyApproved } = await service
        .from('orders')
        .select('payment_status')
        .eq('id', id)
        .single()

      await service
        .from('orders')
        .update({ payment_status: 'approved', order_status: 'paid', mp_payment_id: mpPaymentId })
        .eq('id', id)
        .eq('payment_status', 'pending')

      // Só processa loyalty e email se não estava aprovado antes (evita duplicatas)
      if (wasAlreadyApproved?.payment_status !== 'approved') {
        await processLoyaltyPoints(id, service)
        const { data: pedidoAprovado } = await service.from('orders').select('*').eq('id', id).single()
        if (pedidoAprovado) enviarEmailConfirmacaoPedido(pedidoAprovado as Order).catch(() => {})
      }
    } else if (mpRealStatus === 'in_process' || mpRealStatus === 'pending') {
      await service
        .from('orders')
        .update({ payment_status: 'pending', mp_payment_id: mpPaymentId })
        .eq('id', id)
        .neq('payment_status', 'approved')
    } else if (mpRealStatus === 'rejected' || mpRealStatus === 'cancelled') {
      const { data: pedidoAntes } = await service
        .from('orders')
        .select('payment_status, items')
        .eq('id', id)
        .single()

      await service
        .from('orders')
        .update({ payment_status: 'rejected', order_status: 'cancelled', mp_payment_id: mpPaymentId })
        .eq('id', id)
        .neq('payment_status', 'approved')

      // Restaurar estoque (só se estava pending — evita dupla restauração)
      if (pedidoAntes && pedidoAntes.payment_status === 'pending') {
        const orderItems = (pedidoAntes.items || []) as Array<{ product_id: string; quantity: number }>
        for (const item of orderItems) {
          const { data: bundle } = await service
            .from('bundles').select('id, stock').eq('id', item.product_id).maybeSingle()
          if (bundle) {
            await service.from('bundles').update({ stock: bundle.stock + item.quantity }).eq('id', item.product_id)
          } else {
            const { data: product } = await service
              .from('products').select('id, stock').eq('id', item.product_id).maybeSingle()
            if (product) {
              await service.from('products').update({ stock: product.stock + item.quantity }).eq('id', item.product_id)
            }
          }
        }
      }
    }
  }

  // MP redireciona para failure URL sem params — usar mp_result=failure para detectar
  if (mpResult === 'failure') {
    const { data: pedidoAntes } = await service
      .from('orders')
      .select('payment_status, items')
      .eq('id', id)
      .single()

    await service
      .from('orders')
      .update({ payment_status: 'rejected', order_status: 'cancelled' })
      .eq('id', id)
      .neq('payment_status', 'approved')

    // Restaurar estoque (só se estava pending — evita dupla restauração)
    if (pedidoAntes && pedidoAntes.payment_status === 'pending') {
      const orderItems = (pedidoAntes.items || []) as Array<{ product_id: string; quantity: number }>
      for (const item of orderItems) {
        const { data: bundle } = await service
          .from('bundles').select('id, stock').eq('id', item.product_id).maybeSingle()
        if (bundle) {
          await service.from('bundles').update({ stock: bundle.stock + item.quantity }).eq('id', item.product_id)
        } else {
          const { data: product } = await service
            .from('products').select('id, stock').eq('id', item.product_id).maybeSingle()
          if (product) {
            await service.from('products').update({ stock: product.stock + item.quantity }).eq('id', item.product_id)
          }
        }
      }
    }
  }

  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const o = order as Order
  const isPix = o.payment_method === 'pix'

  // O banco é a fonte da verdade — se já está approved (via API do MP ou webhook), mostrar approved
  const displayStatus = o.payment_status === 'approved' ? 'approved'
    : (mpResult === 'failure' || mpRealStatus === 'rejected' || mpRealStatus === 'cancelled') ? 'rejected'
    : mpRealStatus === 'approved' ? 'approved'
    : (mpRealStatus === 'in_process' || mpRealStatus === 'pending') ? 'pending'
    : o.payment_status

  const isPending             = displayStatus === 'pending'
  const isRejected            = displayStatus === 'rejected'
  const isPendingVerification = isPending && (mpRealStatus === 'in_process' || mpRealStatus === 'pending')

  const waMessage = `Olá! Realizei um pedido na Space Fit. Número: ${o.order_number}. Pedido de ${o.customer_name} — ${formatBRL(o.total)}. ${isPix ? 'Aguardando confirmação do PIX.' : ''}`

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {/* Polling automático para PIX e pagamentos pendentes */}
      {isPending && <PaymentStatusPoller orderId={o.id} />}
      {/* Ícone de status */}
      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
        isRejected            ? 'bg-red-500/15 border-2 border-red-500'
        : isPendingVerification ? 'bg-yellow-500/15 border-2 border-yellow-400'
        : 'bg-[#b2ea0f]/15 border-2 border-[#b2ea0f]'
      }`}>
        {isRejected
          ? <XCircle className="w-10 h-10 text-red-500" />
          : isPendingVerification
          ? <Clock className="w-10 h-10 text-yellow-400" />
          : <CheckCircle className="w-10 h-10 text-[#b2ea0f]" />
        }
      </div>

      <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
        {isRejected ? 'Pagamento Recusado' : isPendingVerification ? 'Pagamento em Verificação' : 'Pedido Realizado!'}
      </h1>
      <p className="text-[#9ca3af] mb-6">
        {isRejected
          ? <><strong className="text-white">{o.customer_name}</strong>, seu pagamento foi recusado. Tente outro cartão ou forma de pagamento.</>  
          : isPendingVerification
          ? <><strong className="text-white">{o.customer_name}</strong>, seu pagamento está sendo verificado. Você será notificado assim que for confirmado.</>
          : <>Obrigado, <strong className="text-white">{o.customer_name}</strong>! Seu pedido foi recebido com sucesso.</>
        }
      </p>

      {/* Número do pedido */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 mb-6 text-left">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#9ca3af] text-sm">Número do Pedido</span>
          <span className="text-[#b2ea0f] font-black text-lg">{o.order_number}</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#9ca3af] text-sm">Forma de Pagamento</span>
          <span className="text-white font-semibold text-sm">{PAYMENT_METHOD_LABELS[o.payment_method]}</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#9ca3af] text-sm">Status</span>
          <span className={`font-semibold text-sm ${
            displayStatus === 'approved' ? 'text-[#b2ea0f]' :
            displayStatus === 'rejected' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {displayStatus === 'approved' ? '✓ Pago' :
             displayStatus === 'rejected' ? '✗ Recusado' :
             '⏳ Aguardando pagamento'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#9ca3af] text-sm">Total</span>
          <span className="text-[#b2ea0f] font-black text-xl">{formatBRL(o.total)}</span>
        </div>
      </div>

      {/* Itens do pedido */}
      {o.items?.length > 0 && (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 mb-6 text-left">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-[#b2ea0f]" />
            <h2 className="font-black text-white">Produtos do Pedido</h2>
          </div>
          <div className="space-y-3">
            {o.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {item.product_image && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#2a2a2a] shrink-0">
                    <Image
                      src={item.product_image}
                      alt={item.product_name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{item.product_name}</p>
                  {item.size && <p className="text-xs text-[#9ca3af]">Tamanho: {item.size}</p>}
                  <p className="text-xs text-[#9ca3af]">Qtd: {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-[#b2ea0f] shrink-0">{formatBRL(item.unit_price * item.quantity)}</p>
              </div>
            ))}
          </div>
          {o.discount > 0 && (
            <div className="flex justify-between mt-3 pt-3 border-t border-[#2a2a2a] text-sm">
              <span className="text-[#9ca3af]">Desconto</span>
              <span className="text-green-400">− {formatBRL(o.discount)}</span>
            </div>
          )}
        </div>
      )}

      {/* Botão finalizar pagamento se pendente (permite retomada) */}
      {isPending && o.payment_method !== 'pickup' && (
        <div className="bg-[#111111] border border-[#b2ea0f]/30 rounded-2xl p-5 mb-6">
          <p className="text-sm text-[#9ca3af] mb-3">Seu pedido foi criado mas o pagamento ainda não foi confirmado. Clique abaixo para finalizar.</p>
          <a
            href={`/api/checkout/retry/${o.id}`}
            className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#b2ea0f] text-black font-black hover:bg-[#c8f040] transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Finalizar Pagamento
          </a>
        </div>
      )}

      {/* Botão tentar novamente se recusado */}
      {isRejected && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-6">
          <p className="text-sm text-[#9ca3af] mb-3">Você pode tentar novamente com outro cartão ou entrar em contato pelo WhatsApp.</p>
          <a href={`/api/checkout/retry/${o.id}`} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-black hover:bg-gray-100 transition-colors">
            <ShoppingBag className="w-4 h-4" />
            Tentar Novamente
          </a>
        </div>
      )}

      {/* Card em verificação */}
      {isPendingVerification && (
        <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-2xl p-5 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-yellow-400" />
            <h2 className="font-black text-white">Aguardando confirmação</h2>
          </div>
          <p className="text-sm text-[#9ca3af]">Seu pagamento está sendo processado. Assim que confirmado, seu pedido será liberado automaticamente e você receberá um e-mail.</p>
        </div>
      )}

      {/* Instrução PIX */}
      {isPix && isPending && (
        <div className="bg-[#111111] border border-[#b2ea0f]/30 rounded-2xl p-5 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-[#b2ea0f]" />
            <h2 className="font-black text-white">Instrução para Pagamento PIX</h2>
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-xl text-center text-[#d1d5db] text-sm">
            <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="font-semibold text-yellow-400 mb-1">Pagamento aguardando</p>
            <p>Entre em contato pelo WhatsApp para obter a chave PIX e confirmar o pagamento.</p>
          </div>
          <a
            href={getWhatsAppLink(waMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#25D366] text-black font-black hover:bg-[#20bd5a] transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Enviar Comprovante pelo WhatsApp
          </a>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={getWhatsAppLink(waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#25D366] text-[#25D366] font-bold hover:bg-[#25D366] hover:text-black transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          Falar no WhatsApp
        </a>
        <Link href="/" className="btn-green">
          <ShoppingBag className="w-4 h-4" />
          Continuar Comprando
        </Link>
      </div>
    </div>
  )
}
