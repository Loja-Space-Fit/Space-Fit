// =============================================================================
// lib/csv.ts - Utilitario para gerar e baixar arquivos CSV
// =============================================================================
// Funcoes puras, sem dependencias externas. Usadas em qualquer parte do
// painel admin que precise exportar dados (pedidos, clientes, produtos).
//
// Uso tipico:
//   const conteudo = gerarCSV(['Nome', 'Total'], [['Ana', '150'], ['Bruno', '300']])
//   baixarCSV('relatorio-pedidos', conteudo)
// =============================================================================

// Escapa um valor para CSV: se tiver virgula, aspas ou quebra de linha,
// envolve em aspas e dobra as aspas internas.
function escaparCampo(valor: string | number | null | undefined): string {
  const texto = String(valor ?? '')
  if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

// Converte cabecalhos + linhas em uma string CSV com BOM UTF-8.
// O BOM (0xFEFF) garante que o Excel abra o arquivo com acentos corretos.
export function gerarCSV(
  cabecalhos: string[],
  linhas: (string | number | null | undefined)[][]
): string {
  const bom      = '\uFEFF'
  const cabecalho = cabecalhos.map(escaparCampo).join(',')
  const corpo     = linhas
    .map(linha => linha.map(escaparCampo).join(','))
    .join('\n')

  return `${bom}${cabecalho}\n${corpo}`
}

// Dispara o download do arquivo CSV no navegador do usuario.
// nome: sem extensao (ex: 'pedidos-abril') — a funcao adiciona .csv
export function baixarCSV(nome: string, conteudo: string): void {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)

  const link    = document.createElement('a')
  link.href     = url
  link.download = `${nome}.csv`
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Libera a URL para nao vazar memoria
  URL.revokeObjectURL(url)
}

// =============================================================================
// FORMATADORES PRONTOS PARA CADA ENTIDADE
// =============================================================================

// Converte a lista de pedidos para CSV diretamente — evita duplicar
// a logica de formatacao em cada componente que precisar exportar.
export function pedidosParaCSV(pedidos: {
  order_number:   string
  customer_name:  string
  customer_phone: string
  customer_email?: string | null
  total:          number
  order_status:   string
  payment_status: string
  payment_method: string
  created_at:     string
}[]): string {
  const cabecalhos = [
    'Numero do Pedido',
    'Cliente',
    'Telefone',
    'Email',
    'Total (R$)',
    'Status do Pedido',
    'Status do Pagamento',
    'Forma de Pagamento',
    'Data',
  ]

  const linhas = pedidos.map(p => [
    p.order_number,
    p.customer_name,
    p.customer_phone,
    p.customer_email ?? '',
    p.total.toFixed(2).replace('.', ','),
    traduzirStatusPedido(p.order_status),
    traduzirStatusPagamento(p.payment_status),
    traduzirFormaPagamento(p.payment_method),
    new Date(p.created_at).toLocaleDateString('pt-BR'),
  ])

  return gerarCSV(cabecalhos, linhas)
}

// Converte a lista de clientes do CRM para CSV.
export function clientesParaCSV(clientes: {
  customer_name:  string
  customer_phone: string
  customer_email: string | null
  total_gasto:    number
  total_pedidos:  number
  ultima_compra:  string
  classificacao:  string
}[]): string {
  const cabecalhos = [
    'Nome',
    'Telefone',
    'Email',
    'Total Gasto (R$)',
    'Numero de Pedidos',
    'Ultima Compra',
    'Classificacao',
  ]

  const linhas = clientes.map(c => [
    c.customer_name,
    c.customer_phone,
    c.customer_email ?? '',
    c.total_gasto.toFixed(2).replace('.', ','),
    c.total_pedidos,
    new Date(c.ultima_compra).toLocaleDateString('pt-BR'),
    c.classificacao,
  ])

  return gerarCSV(cabecalhos, linhas)
}

// =============================================================================
// HELPERS DE TRADUCAO (reusados nos CSVs)
// =============================================================================

function traduzirStatusPedido(status: string): string {
  const mapa: Record<string, string> = {
    pending:   'Pendente',
    paid:      'Pago',
    preparing: 'Preparando',
    shipped:   'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  }
  return mapa[status] ?? status
}

function traduzirStatusPagamento(status: string): string {
  const mapa: Record<string, string> = {
    pending:  'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    refunded: 'Estornado',
  }
  return mapa[status] ?? status
}

function traduzirFormaPagamento(metodo: string): string {
  const mapa: Record<string, string> = {
    pix:         'PIX',
    credit_card: 'Cartao de Credito',
    pickup:      'Retirada na Loja',
  }
  return mapa[metodo] ?? metodo
}
