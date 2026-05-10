// Utilitario de email com Resend.
// Todas as funcoes sao fire-and-forget: erros sao logados mas nao propagados
// para nao bloquear a operacao principal (ex: atualizar status de pedido).
//
// Variaveis de ambiente necessarias no .env.local:
//   RESEND_API_KEY=re_xxxx
//   RESEND_FROM_EMAIL=noreply@seudomain.com  (dominio verificado no Resend)

import { Resend } from 'resend'
import { formatBRL } from '@/lib/utils'
import type { Order } from '@/types'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const EMAIL_REMETENTE =
  `Space Fit <${process.env.RESEND_FROM_EMAIL ?? 'noreply@lojaspacefit.com.br'}>`

// =============================================================================
// Templates HTML em pt-BR com identidade visual Space Fit
// =============================================================================

function layoutEmail(titulo: string, corpo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="420" cellpadding="0" cellspacing="0" style="max-width:420px;width:100%;background:#111111;border-radius:16px;overflow:hidden;">

        <!-- Cabecalho -->
        <tr>
          <td style="padding:48px 40px 0;text-align:center;">
            <p style="margin:0 0 6px;font-size:28px;font-weight:900;color:#b2ea0f;letter-spacing:3px;">SPACE FIT</p>
            <p style="margin:0 0 28px;font-size:12px;color:#6b7280;letter-spacing:1px;">Sua loja fitness</p>
            <div style="width:40px;height:2px;background:#b2ea0f;margin:0 auto;"></div>
          </td>
        </tr>

        <!-- Corpo -->
        <tr>
          <td style="padding:32px 40px 40px;">
            ${corpo}
          </td>
        </tr>

        <!-- Rodape -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #1f1f1f;text-align:center;">
            <p style="margin:0;font-size:11px;color:#374151;">
              E-mail enviado automaticamente &middot; Não responda
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// =============================================================================
// Bloco de itens do pedido — reutilizado em varios templates
// =============================================================================
function htmlItens(pedido: Order): string {
  const linhas = pedido.items
    .map(
      item => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#d1d5db;">
          ${item.product_name}${item.size ? ` <span style="color:#9ca3af;">(${item.size})</span>` : ''}
          &times; ${item.quantity}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#ffffff;text-align:right;font-weight:bold;">
          ${formatBRL(item.total_price)}
        </td>
      </tr>`
    )
    .join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      ${linhas}
      ${pedido.discount > 0 ? `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#b2ea0f;">Desconto${pedido.coupon_code ? ` (${pedido.coupon_code})` : ''}</td>
        <td style="padding:8px 0;font-size:13px;color:#b2ea0f;text-align:right;">- ${formatBRL(pedido.discount)}</td>
      </tr>` : ''}
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#9ca3af;">Frete</td>
        <td style="padding:8px 0;font-size:13px;color:#9ca3af;text-align:right;">${pedido.shipping === 0 ? 'Gratis' : formatBRL(pedido.shipping)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0 0;font-size:16px;font-weight:900;color:#ffffff;border-top:1px solid #2a2a2a;">Total</td>
        <td style="padding:12px 0 0;font-size:16px;font-weight:900;color:#b2ea0f;text-align:right;border-top:1px solid #2a2a2a;">${formatBRL(pedido.total)}</td>
      </tr>
    </table>`
}

// =============================================================================
// Email 1: Confirmacao de pedido pago
// =============================================================================
export async function enviarEmailConfirmacaoPedido(pedido: Order): Promise<void> {
  if (!pedido.customer_email) return
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY nao configurado — email de confirmacao ignorado.')
    return
  }

  const corpo = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#ffffff;">
      Pedido confirmado!
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">
      Ola, ${pedido.customer_name}. Recebemos seu pedido e o pagamento foi aprovado.
    </p>

    <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
        Numero do pedido
      </p>
      <p style="margin:0;font-size:20px;font-weight:900;color:#b2ea0f;">${pedido.order_number}</p>
    </div>

    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
      Resumo da compra
    </p>
    ${htmlItens(pedido)}

    ${pedido.address ? `
    <div style="margin-top:24px;background:#1a1a1a;border-radius:12px;padding:16px;">
      <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Endereco de entrega</p>
      <p style="margin:0;font-size:14px;color:#d1d5db;">
        ${pedido.address.street}, ${pedido.address.number}${pedido.address.complement ? `, ${pedido.address.complement}` : ''}<br/>
        ${pedido.address.neighborhood}, ${pedido.address.city}/${pedido.address.state}<br/>
        CEP ${pedido.address.cep}
      </p>
    </div>` : ''}

    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      Em breve seu pedido entrara em preparacao. Voce recebera outro email quando ele for enviado.
    </p>`

  try {
    await getResend().emails.send({
      from:    EMAIL_REMETENTE,
      to:      pedido.customer_email,
      subject: `Pedido ${pedido.order_number} confirmado | Space Fit`,
      html:    layoutEmail('Pedido confirmado', corpo),
    })
  } catch (erro) {
    console.error('[email] Erro ao enviar confirmacao de pedido:', erro)
  }
}

// =============================================================================
// Email 2: Pedido pronto para retirada na academia
// =============================================================================
export async function enviarEmailProntoParaRetirada(pedido: Order): Promise<void> {
  if (!pedido.customer_email) return
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY nao configurado — email de retirada ignorado.')
    return
  }

  // Buscar o label da unidade no banco (dinâmico, não depende de mapa fixo)
  let unidade = pedido.pickup_location ?? 'nossa academia'
  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = createServiceClient()
    const { data: region } = await supabase
      .from('academy_regions')
      .select('label')
      .eq('value', pedido.pickup_location ?? '')
      .maybeSingle()
    if (region?.label) unidade = region.label
  } catch { /* usa o valor bruto como fallback */ }

  const corpo = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#ffffff;">
      Seu produto está esperando por você!
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">
      Olá, ${pedido.customer_name}! Seu pedido foi confirmado e está disponível para retirada em <strong style="color:#ffffff;">${unidade}</strong>.
    </p>

    <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
        Número do pedido
      </p>
      <p style="margin:0;font-size:20px;font-weight:900;color:#b2ea0f;">${pedido.order_number}</p>
    </div>

    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
      Resumo da compra
    </p>
    ${htmlItens(pedido)}

    <div style="margin-top:24px;background:#1a1a1a;border-radius:12px;padding:16px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Local de retirada</p>
      <p style="margin:0;font-size:15px;font-weight:700;color:#b2ea0f;">📍 ${unidade}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">
        Apresente este e-mail ou o número do pedido na recepção.
      </p>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      Qualquer dúvida, fale com a gente pelo WhatsApp. Até lá!
    </p>`

  try {
    await getResend().emails.send({
      from:    EMAIL_REMETENTE,
      to:      pedido.customer_email,
      subject: `Seu produto está pronto para retirada! Pedido ${pedido.order_number} | Space Fit`,
      html:    layoutEmail('Pronto para retirada', corpo),
    })
  } catch (erro) {
    console.error('[email] Erro ao enviar email de retirada:', erro)
  }
}

// =============================================================================
// Email 3 (antes 2): Atualização de status (Enviado / Entregue)
// =============================================================================

const MENSAGENS_STATUS: Record<string, { assunto: string; titulo: string; descricao: string }> = {
  shipped: {
    assunto:    'Seu pedido foi enviado!',
    titulo:     'Pedido a caminho!',
    descricao:  'Seu pedido foi despachado e esta a caminho do seu endereco. Fique de olho no rastreamento.',
  },
  delivered: {
    assunto:    'Pedido entregue: obrigado por comprar na Space Fit!',
    titulo:     'Pedido entregue!',
    descricao:  'Seu pedido foi entregue. Esperamos que voce curta muito sua compra!',
  },
}

export async function enviarEmailStatusAtualizado(
  pedido: Order,
  novoStatus: string
): Promise<void> {
  if (!pedido.customer_email) return
  if (!process.env.RESEND_API_KEY) return
  if (!MENSAGENS_STATUS[novoStatus]) return // So envia para shipped e delivered

  const msg = MENSAGENS_STATUS[novoStatus]

  const corpo = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#ffffff;">
      ${msg.titulo}
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">
      Ola, ${pedido.customer_name}. ${msg.descricao}
    </p>

    <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
        Numero do pedido
      </p>
      <p style="margin:0;font-size:20px;font-weight:900;color:#b2ea0f;">${pedido.order_number}</p>
    </div>

    ${htmlItens(pedido)}

    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      Obrigado por comprar na Space Fit! Qualquer duvida entre em contato conosco.
    </p>`

  try {
    await getResend().emails.send({
      from:    EMAIL_REMETENTE,
      to:      pedido.customer_email,
      subject: `${msg.assunto} | Pedido ${pedido.order_number}`,
      html:    layoutEmail(msg.titulo, corpo),
    })
  } catch (erro) {
    console.error('[email] Erro ao enviar atualizacao de status:', erro)
  }
}

// =============================================================================
// Email 3: Boas-vindas ao novo cliente (substitui confirmação de email da Supabase)
// =============================================================================
export async function enviarEmailBoasVindas(nome: string, email: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY nao configurado — email de boas-vindas ignorado.')
    return
  }

  const corpo = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#ffffff;">
      Bem-vindo à Space Fit, ${nome}!
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">
      Sua conta foi criada com sucesso. Agora você pode aproveitar todas as novidades da nossa loja!
    </p>

    <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Sua conta</p>
      <p style="margin:0;font-size:16px;font-weight:700;color:#b2ea0f;">${email}</p>
    </div>

    <p style="margin:0 0 12px;font-size:14px;color:#d1d5db;">
      Explore nossa seleção de roupas, suplementos e acessórios fitness com os melhores preços e qualidade.
    </p>
    <p style="margin:0;font-size:13px;color:#9ca3af;">
      Qualquer dúvida, fale com a gente pelo WhatsApp, estamos sempre prontos para ajudar!
    </p>`

  try {
    await getResend().emails.send({
      from:    EMAIL_REMETENTE,
      to:      email,
      subject: 'Bem-vindo à Space Fit!',
      html:    layoutEmail('Bem-vindo à Space Fit', corpo),
    })
  } catch (erro) {
    console.error('[email] Erro ao enviar email de boas-vindas:', erro)
  }
}

// =============================================================================
// Email 4: Confirmação de conta (enviado no cadastro via Resend)
// =============================================================================
export async function enviarEmailConfirmacaoConta(nome: string, email: string, confirmUrl: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY nao configurado — email de confirmacao ignorado.')
    return
  }

  const corpo = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#ffffff;">
      Confirme sua conta
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">
      Ola, ${nome}! Clique no botao abaixo para ativar sua conta na Space Fit.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${confirmUrl}"
        style="display:inline-block;background:#b2ea0f;color:#000000;font-size:15px;font-weight:900;text-decoration:none;padding:14px 32px;border-radius:12px;letter-spacing:0.5px;">
        CONFIRMAR MINHA CONTA
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">
      Se voce nao criou uma conta na Space Fit, ignore este email.
      O link expira em 24 horas.
    </p>`

  try {
    await getResend().emails.send({
      from:    EMAIL_REMETENTE,
      to:      email,
      subject: 'Confirme sua conta — Space Fit',
      html:    layoutEmail('Confirme sua conta', corpo),
    })
  } catch (erro) {
    console.error('[email] Erro ao enviar email de confirmacao de conta:', erro)
  }
}

// =============================================================================
// Email 5: Redefinição de senha
// =============================================================================
export async function enviarEmailRedefinirSenha(nome: string, email: string, resetUrl: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY nao configurado — email de redefinicao ignorado.')
    return
  }

  const corpo = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#ffffff;">
      Redefinir senha
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#9ca3af;">
      Ola${nome ? `, ${nome}` : ''}! Recebemos uma solicitacao para redefinir a senha da sua conta.
    </p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
        style="display:inline-block;background:#b2ea0f;color:#000000;font-size:15px;font-weight:900;text-decoration:none;padding:14px 32px;border-radius:12px;letter-spacing:0.5px;">
        REDEFINIR MINHA SENHA
      </a>
    </div>

    <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">
      Se voce nao solicitou a redefinicao de senha, ignore este email.
      O link expira em 1 hora.
    </p>`

  try {
    await getResend().emails.send({
      from:    EMAIL_REMETENTE,
      to:      email,
      subject: 'Redefinir senha — Space Fit',
      html:    layoutEmail('Redefinir senha', corpo),
    })
  } catch (erro) {
    console.error('[email] Erro ao enviar email de redefinicao de senha:', erro)
  }
}
