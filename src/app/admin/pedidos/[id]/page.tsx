// Pagina de detalhe do pedido — otimizada para impressao.
// Mantemos a expansao inline na lista de pedidos; esta rota serve como
// versao de impressao / link permanente para cada pedido.

import { createServiceClient } from '@/lib/supabase/server'
import { notFound }            from 'next/navigation'
import { formatBRL }           from '@/lib/utils'
import type { Order }          from '@/types'
import type { Metadata }       from 'next'
import { ArrowLeft }           from 'lucide-react'
import BotaoImprimir           from '@/components/admin/BotaoImprimir'

export const metadata: Metadata = {
  title: 'Detalhe do Pedido',
}

const ROTULO_STATUS: Record<string, string> = {
  pending:   'Pendente',
  paid:      'Pago',
  preparing: 'Preparando',
  shipped:   'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const ROTULO_PAGAMENTO: Record<string, string> = {
  pending:  'Aguardando',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  refunded: 'Estornado',
}

const COR_STATUS: Record<string, { bg: string; texto: string }> = {
  pending:   { bg: 'bg-yellow-400/15', texto: 'text-yellow-400'   },
  paid:      { bg: 'bg-green-400/15',  texto: 'text-green-400'    },
  preparing: { bg: 'bg-blue-400/15',   texto: 'text-blue-400'     },
  shipped:   { bg: 'bg-purple-400/15', texto: 'text-purple-400'   },
  delivered: { bg: 'bg-[#b2ea0f]/15',  texto: 'text-[#b2ea0f]'   },
  cancelled: { bg: 'bg-red-400/15',    texto: 'text-red-400'      },
}

// =============================================================================
// Componente de linha da tabela de itens
// =============================================================================
function LinhaItem({ item }: { item: Order['items'][number] }) {
  return (
    <tr className="border-b border-[#2a2a2a] print:border-gray-300">
      <td className="py-3 pr-4 text-sm text-white print:text-black">
        {item.product_name}
        {item.size && (
          <span className="ml-2 text-xs text-[#9ca3af] print:text-gray-500">
            Tamanho: {item.size}
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-center text-[#9ca3af] print:text-gray-600">
        {item.quantity}
      </td>
      <td className="py-3 px-4 text-sm text-right text-[#9ca3af] print:text-gray-600">
        {formatBRL(item.unit_price)}
      </td>
      <td className="py-3 pl-4 text-sm text-right font-bold text-white print:text-black">
        {formatBRL(item.total_price)}
      </td>
    </tr>
  )
}

// =============================================================================
// Secao de card — mesma aparencia dos demais cards do admin
// =============================================================================
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden print:border-gray-300 print:bg-white">
      <div className="px-5 py-3 border-b border-[#2a2a2a] print:border-gray-300">
        <h2 className="text-xs font-bold text-[#9ca3af] uppercase tracking-wider print:text-gray-500">
          {titulo}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// =============================================================================
// PAGE
// =============================================================================
export default async function DetalhesPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: pedido } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!pedido) notFound()

  const p = pedido as Order
  const badgeStatus = COR_STATUS[p.order_status] ?? { bg: 'bg-[#2a2a2a]', texto: 'text-white' }
  const dataFormatada = new Date(p.created_at).toLocaleString('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return (
    <>
      {/* Estilos globais de impressao — ocultam tudo que nao e conteudo */}
      <style>{`
        @media print {
          .nao-imprimir { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="flex flex-col gap-6 max-w-3xl mx-auto">

        {/* Botoes de acao — nao aparecem na impressao */}
        <div className="nao-imprimir flex items-center justify-between flex-wrap gap-3">
          <a
            href="/admin/pedidos"
            className="flex items-center gap-2 text-sm text-[#9ca3af] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para pedidos
          </a>
          <BotaoImprimir />
        </div>

        {/* Cabecalho do pedido */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl px-6 py-5 print:border-gray-300 print:bg-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-[#9ca3af] uppercase tracking-wider mb-1 print:text-gray-500">
                Pedido
              </p>
              <h1 className="text-2xl font-black text-[#b2ea0f] print:text-black">
                {p.order_number}
              </h1>
              <p className="text-sm text-[#9ca3af] mt-1 print:text-gray-500">{dataFormatada}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${badgeStatus.bg} ${badgeStatus.texto} print:bg-gray-100 print:text-black`}
              >
                {ROTULO_STATUS[p.order_status] ?? p.order_status}
              </span>
              <span className="text-xs text-[#9ca3af] print:text-gray-500">
                Pagamento:{' '}
                <strong className="text-white print:text-black">
                  {ROTULO_PAGAMENTO[p.payment_status] ?? p.payment_status}
                </strong>
              </span>
              {p.mp_payment_id && (
                <span className="text-xs text-[#9ca3af] print:text-gray-500">
                  ID MP: {p.mp_payment_id}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cliente */}
        <Secao titulo="Cliente">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[#9ca3af] text-xs mb-0.5 print:text-gray-500">Nome</p>
              <p className="text-white font-semibold print:text-black">{p.customer_name}</p>
            </div>
            <div>
              <p className="text-[#9ca3af] text-xs mb-0.5 print:text-gray-500">Telefone</p>
              <p className="text-white print:text-black">{p.customer_phone}</p>
            </div>
            {p.customer_email && (
              <div className="sm:col-span-2">
                <p className="text-[#9ca3af] text-xs mb-0.5 print:text-gray-500">Email</p>
                <p className="text-white print:text-black">{p.customer_email}</p>
              </div>
            )}
          </div>
        </Secao>

        {/* Endereço */}
        {p.address ? (
          <Secao titulo="Endereco de Entrega">
            <div className="text-sm text-white print:text-black space-y-0.5">
              <p>{p.address.street}, {p.address.number}{p.address.complement ? ` — ${p.address.complement}` : ''}</p>
              <p>{p.address.neighborhood}</p>
              <p>{p.address.city} / {p.address.state} &mdash; CEP {p.address.cep}</p>
            </div>
          </Secao>
        ) : (
          <Secao titulo="Entrega">
            <p className="text-sm text-[#9ca3af] print:text-gray-500">Retirada na loja / sem endereco cadastrado</p>
          </Secao>
        )}

        {/* Itens */}
        <Secao titulo="Itens do Pedido">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a] print:border-gray-300 text-xs text-[#9ca3af] print:text-gray-500 uppercase">
                  <th className="text-left pb-2 pr-4">Produto</th>
                  <th className="text-center pb-2 px-4">Qtd</th>
                  <th className="text-right pb-2 px-4">Unit.</th>
                  <th className="text-right pb-2 pl-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {p.items.map((item, i) => (
                  <LinhaItem key={i} item={item} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Totais */}
          <div className="mt-4 pt-4 border-t border-[#2a2a2a] print:border-gray-300 space-y-1.5 text-sm">
            <div className="flex justify-between text-[#9ca3af] print:text-gray-500">
              <span>Subtotal</span>
              <span>{formatBRL(p.subtotal)}</span>
            </div>
            {p.discount > 0 && (
              <div className="flex justify-between text-[#b2ea0f] print:text-green-700">
                <span>Desconto{p.coupon_code ? ` (${p.coupon_code})` : ''}</span>
                <span>- {formatBRL(p.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#9ca3af] print:text-gray-500">
              <span>Frete</span>
              <span>{p.shipping === 0 ? 'Gratis' : formatBRL(p.shipping)}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-white print:text-black border-t border-[#2a2a2a] print:border-gray-300 pt-2 mt-2">
              <span>Total</span>
              <span className="text-[#b2ea0f] print:text-black">{formatBRL(p.total)}</span>
            </div>
          </div>
        </Secao>

        {/* Notas */}
        {p.notes && (
          <Secao titulo="Observacoes">
            <p className="text-sm text-[#d1d5db] print:text-black whitespace-pre-wrap">{p.notes}</p>
          </Secao>
        )}

      </div>
    </>
  )
}
