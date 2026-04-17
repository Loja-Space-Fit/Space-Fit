import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatBRL, getWhatsAppLink, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/utils'
import { CheckCircle, Clock, QrCode, MessageCircle, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import type { Order } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const o = order as Order
  const isPix = o.payment_method === 'pix'
  const isPending = o.payment_status === 'pending'

  const waMessage = `Olá! Realizei um pedido na Space Fit. Número: ${o.order_number}. Pedido de ${o.customer_name} — ${formatBRL(o.total)}. ${isPix ? 'Aguardando confirmação do PIX.' : ''}`

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {/* Ícone de sucesso */}
      <div className="w-20 h-20 mx-auto rounded-full bg-[#b2ea0f]/15 border-2 border-[#b2ea0f] flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-[#b2ea0f]" />
      </div>

      <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
        Pedido Realizado!
      </h1>
      <p className="text-[#9ca3af] mb-6">
        Obrigado, <strong className="text-white">{o.customer_name}</strong>! Seu pedido foi recebido com sucesso.
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
          <span className={`font-semibold text-sm ${o.payment_status === 'approved' ? 'text-[#b2ea0f]' : 'text-yellow-400'}`}>
            {o.payment_status === 'approved' ? '✓ Pago' : '⏳ Aguardando pagamento'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#9ca3af] text-sm">Total</span>
          <span className="text-[#b2ea0f] font-black text-xl">{formatBRL(o.total)}</span>
        </div>
      </div>

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
