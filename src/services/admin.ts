// =============================================================================
// services/admin.ts - Queries centralizadas do painel administrativo
// =============================================================================
// Todas as chamadas ao Supabase do painel admin passam por aqui.
// Evita duplicar queries espalhadas por varios page.tsx e facilita ajustar
// logica de negocio em um so lugar.
// =============================================================================

import { createClient } from '@/lib/supabase/server'
import type { OrderItem } from '@/types'

// =============================================================================
// TIPOS DO PAINEL ADMIN
// =============================================================================

// Um ponto de dados no grafico de vendas (um por dia)
export interface VendaDiaria {
  data: string      // formato DD/MM
  receita: number
  pedidos: number
}

// Produto mais vendido — calculado agregando os JSONB de items dos pedidos
export interface ProdutoMaisVendido {
  produto_id:        string
  nome:              string
  quantidade_vendida: number
  receita_gerada:    number
}

// Tudo que o dashboard precisa para montar os cards e graficos
export interface MetricasDashboard {
  receitaHoje:          number
  receitaHojePendente:  number
  receitaOntem:         number
  receitaMesAtual:      number
  receitaMesAnterior:   number
  receitaTotal:         number
  pedidosHoje:          number
  pedidosOntem:         number
  pedidos7dias:         number
  pedidos30dias:        number
  pedidosPendentes:     number
  ticketMedio:          number   // receita total / numero de pedidos pagos
  totalProdutosAtivos:  number
  produtosEstoqueBaixo: number   // estoque entre 1 e 5
  produtosEstoqueZerado: number  // estoque = 0
  produtosSemVenda30d:  number   // ativos sem nenhuma venda nos ultimos 30 dias
  clientesNovos30d:     number   // compraram so 1 vez no periodo
  clientesRecorrentes30d: number // compraram 2+ vezes no periodo
}

// Produto para exibir nos alertas de estoque
export interface ProdutoAlerta {
  id:    string
  name:  string
  stock: number
}

// Pedido pendente ha mais de 24h — merece alerta
export interface PedidoPendente {
  id:            string
  order_number:  string
  customer_name: string
  created_at:    string
  horas_aguardando: number
}

// Resultado consolidado de todos os alertas do painel
export interface TodosAlertas {
  estoque: {
    zerados: ProdutoAlerta[]
    baixo:   ProdutoAlerta[]
  }
  pedidosPendentesAntigos: PedidoPendente[]
  produtosSemVenda30d:     ProdutoAlerta[]
}

// Linha da tabela de ultimos pedidos no dashboard
export interface PedidoRecente {
  id:             string
  order_number:   string
  customer_name:  string
  total:          number
  order_status:   string
  payment_status: string
  created_at:     string
}

// Cliente agregado para o CRM
export interface ClienteResumo {
  customer_phone: string
  customer_name:  string
  customer_email: string | null
  total_gasto:    number
  total_pedidos:  number
  ultima_compra:  string
  classificacao:  'VIP' | 'Recorrente' | 'Inativo' | 'Novo'
}

// =============================================================================
// HELPERS INTERNOS
// =============================================================================

function inicioDoDia(data: Date): string {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function inicioDoMes(data: Date): string {
  return new Date(data.getFullYear(), data.getMonth(), 1).toISOString()
}

function somarReceita(pedidos: { total: number }[]): number {
  return pedidos.reduce((acc, p) => acc + Number(p.total), 0)
}

// =============================================================================
// METRICAS PRINCIPAIS DO DASHBOARD
// =============================================================================

// Busca tudo em paralelo para nao bloquear a render do servidor.
// O dashboard chama so essa funcao — ela ja entrega tudo pronto.
export async function buscarMetricasDashboard(): Promise<MetricasDashboard> {
  const supabase = await createClient()
  const agora    = new Date()

  const inicioHoje        = inicioDoDia(agora)
  const inicioOntem       = inicioDoDia(new Date(agora.getTime() - 86_400_000))
  const inicio7dias       = new Date(agora.getTime() -  7 * 86_400_000).toISOString()
  const inicio30dias      = new Date(agora.getTime() - 30 * 86_400_000).toISOString()
  const inicioMesAtual    = inicioDoMes(agora)
  const inicioMesAnterior = inicioDoMes(new Date(agora.getFullYear(), agora.getMonth() - 1, 1))

  const [
    { data: pedidosHoje         },
    { data: pedidosHojePendente },
    { data: pedidosOntem        },
    { data: pedidos7dias        },
    { data: pedidos30dias       },
    { data: pedidosAntigos      },
    { data: pedidosMesAtual     },
    { data: pedidosMesAnterior  },
    { data: pedidosPagos        },
    { data: pedidosPendentes    },
    { data: todosProdutosAtivos },
    { data: produtosEstoqueBaixo  },
    { data: produtosEstoqueZerado },
  ] = await Promise.all([
    supabase.from('orders').select('total').gte('created_at', inicioHoje).eq('payment_status', 'approved'),

    supabase.from('orders').select('total').gte('created_at', inicioHoje).eq('payment_status', 'pending'),

    supabase.from('orders').select('total')
      .gte('created_at', inicioOntem)
      .lt('created_at', inicioHoje)
      .eq('payment_status', 'approved'),

    supabase.from('orders').select('id').gte('created_at', inicio7dias),

    // Traz o telefone para calcular novos vs recorrentes (últimos 30 dias)
    supabase.from('orders').select('id, customer_phone')
      .gte('created_at', inicio30dias),

    // Pedidos ANTES do período de 30 dias — para detectar clientes novos x recorrentes
    supabase.from('orders').select('customer_phone')
      .lt('created_at', inicio30dias),

    supabase.from('orders').select('total')
      .in('order_status', ['paid', 'delivered'])
      .gte('created_at', inicioMesAtual),

    supabase.from('orders').select('total')
      .in('order_status', ['paid', 'delivered'])
      .gte('created_at', inicioMesAnterior)
      .lt('created_at', inicioMesAtual),

    // Base para receita total e ticket medio
    supabase.from('orders').select('total')
      .in('order_status', ['paid', 'delivered']),

    supabase.from('orders').select('id').eq('order_status', 'pending'),

    supabase.from('products').select('id').eq('active', true),

    supabase.from('products').select('id')
      .eq('active', true).gt('stock', 0).lte('stock', 5),

    supabase.from('products').select('id')
      .eq('active', true).eq('stock', 0),
  ])

  const receitaHoje        = somarReceita(pedidosHoje         ?? [])
  const receitaHojePendente= somarReceita(pedidosHojePendente ?? [])
  const receitaOntem       = somarReceita(pedidosOntem        ?? [])
  const receitaMesAtual    = somarReceita(pedidosMesAtual     ?? [])
  const receitaMesAnterior = somarReceita(pedidosMesAnterior  ?? [])
  const receitaTotal       = somarReceita(pedidosPagos        ?? [])
  const ticketMedio        = (pedidosPagos?.length ?? 0) > 0
    ? receitaTotal / pedidosPagos!.length
    : 0

  // Clientes novos = compraram nos últimos 30d e NUNCA compraram antes
  // Recorrentes = compraram nos últimos 30d e já tinham comprado antes
  const telefonesAntigos = new Set<string>(
    (pedidosAntigos ?? []).map(p => p.customer_phone).filter(Boolean)
  )
  const telefonesRecentes = new Set<string>(
    (pedidos30dias ?? []).map(p => p.customer_phone).filter(Boolean)
  )
  let clientesNovos30d       = 0
  let clientesRecorrentes30d = 0
  for (const tel of telefonesRecentes) {
    if (telefonesAntigos.has(tel)) clientesRecorrentes30d++
    else                           clientesNovos30d++
  }

  const produtosSemVenda30d = await contarProdutosSemVenda(
    todosProdutosAtivos ?? [],
    inicio30dias,
    supabase
  )

  return {
    receitaHoje,
    receitaHojePendente,
    receitaOntem,
    receitaMesAtual,
    receitaMesAnterior,
    receitaTotal,
    pedidosHoje:           pedidosHoje?.length          ?? 0,
    pedidosOntem:          pedidosOntem?.length         ?? 0,
    pedidos7dias:          pedidos7dias?.length         ?? 0,
    pedidos30dias:         pedidos30dias?.length        ?? 0,
    pedidosPendentes:      pedidosPendentes?.length     ?? 0,
    ticketMedio:           Number(ticketMedio.toFixed(2)),
    totalProdutosAtivos:   todosProdutosAtivos?.length  ?? 0,
    produtosEstoqueBaixo:  produtosEstoqueBaixo?.length ?? 0,
    produtosEstoqueZerado: produtosEstoqueZerado?.length?? 0,
    produtosSemVenda30d,
    clientesNovos30d,
    clientesRecorrentes30d,
  }
}

// Descobre quantos produtos ativos nao aparecem em nenhum pedido dos ultimos 30 dias.
// Percorre os JSONB de items — mais flexivel do que uma RPC por enquanto.
async function contarProdutosSemVenda(
  produtosAtivos: { id: string }[],
  desde: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<number> {
  if (produtosAtivos.length === 0) return 0

  const { data: pedidosRecentes } = await supabase
    .from('orders')
    .select('items')
    .gte('created_at', desde)
    .in('order_status', ['paid', 'preparing', 'shipped', 'delivered'])

  const idsComVenda = new Set<string>()
  for (const pedido of pedidosRecentes ?? []) {
    for (const item of (pedido.items as OrderItem[]) ?? []) {
      if (item.product_id) idsComVenda.add(item.product_id)
    }
  }

  return produtosAtivos.filter(p => !idsComVenda.has(p.id)).length
}

// =============================================================================
// GRAFICO DE VENDAS — ultimos N dias
// =============================================================================

// Retorna um array com um ponto por dia, incluindo dias sem vendas (valor zero),
// para o grafico nunca ter "buracos" na linha.
export async function buscarVendasDiarias(dias = 30): Promise<VendaDiaria[]> {
  const supabase = await createClient()
  const desde    = new Date(Date.now() - dias * 86_400_000).toISOString()

  const { data: pedidos } = await supabase
    .from('orders')
    .select('total, created_at')
    .gte('created_at', desde)
    .in('order_status', ['paid', 'preparing', 'shipped', 'delivered'])
    .order('created_at', { ascending: true })

  // Inicializar todos os dias com zero para o grafico nao ter lacunas
  const porDia = new Map<string, { receita: number; pedidos: number }>()
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    const chave = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    porDia.set(chave, { receita: 0, pedidos: 0 })
  }

  for (const pedido of pedidos ?? []) {
    const d     = new Date(pedido.created_at)
    const chave = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    const atual = porDia.get(chave)
    if (atual) {
      atual.receita += Number(pedido.total)
      atual.pedidos += 1
    }
  }

  return Array.from(porDia.entries()).map(([data, val]) => ({
    data,
    receita: Number(val.receita.toFixed(2)),
    pedidos: val.pedidos,
  }))
}

// =============================================================================
// TOP PRODUTOS MAIS VENDIDOS
// =============================================================================

// Agrega os JSONB de items de todos os pedidos concluidos para descobrir
// quais produtos venderam mais. Quando a RPC top_produtos() estiver criada
// no Supabase, substituir por: supabase.rpc('top_produtos', { limite })
export async function buscarTopProdutos(limite = 5): Promise<ProdutoMaisVendido[]> {
  const supabase = await createClient()

  const { data: pedidos } = await supabase
    .from('orders')
    .select('items')
    .in('order_status', ['paid', 'preparing', 'shipped', 'delivered'])

  const acumulador = new Map<string, { nome: string; quantidade: number; receita: number }>()

  for (const pedido of pedidos ?? []) {
    for (const item of (pedido.items as OrderItem[]) ?? []) {
      const existente = acumulador.get(item.product_id)
      if (existente) {
        existente.quantidade += item.quantity
        existente.receita    += Number(item.total_price)
      } else {
        acumulador.set(item.product_id, {
          nome:      item.product_name,
          quantidade: item.quantity,
          receita:   Number(item.total_price),
        })
      }
    }
  }

  return Array.from(acumulador.entries())
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .slice(0, limite)
    .map(([id, val]) => ({
      produto_id:         id,
      nome:               val.nome,
      quantidade_vendida: val.quantidade,
      receita_gerada:     Number(val.receita.toFixed(2)),
    }))
}

// =============================================================================
// PEDIDOS RECENTES (tabela do dashboard)
// =============================================================================

export async function buscarPedidosRecentes(limite = 10): Promise<PedidoRecente[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, total, order_status, payment_status, created_at')
    .order('created_at', { ascending: false })
    .limit(limite)

  return (data ?? []) as PedidoRecente[]
}

// =============================================================================
// ALERTAS DE PRODUTOS
// =============================================================================

export async function buscarProdutosParaAlerta(): Promise<{
  zerados: ProdutoAlerta[]
  baixo:   ProdutoAlerta[]
}> {
  const supabase = await createClient()

  const [{ data: zerados }, { data: baixo }] = await Promise.all([
    supabase.from('products').select('id, name, stock')
      .eq('active', true).eq('stock', 0),

    supabase.from('products').select('id, name, stock')
      .eq('active', true).gt('stock', 0).lte('stock', 5),
  ])

  return {
    zerados: (zerados ?? []) as ProdutoAlerta[],
    baixo:   (baixo   ?? []) as ProdutoAlerta[],
  }
}

// =============================================================================
// TODOS OS ALERTAS — funcao consolidada para o PainelAlertas
// =============================================================================
// Busca em paralelo: estoque zerado/baixo, pedidos pendentes antigos
// e produtos sem nenhuma venda nos ultimos 30 dias.
// O PainelAlertas e o unico consumidor — evita multiplas chamadas ao banco.
export async function buscarTodosAlertas(): Promise<TodosAlertas> {
  const supabase   = await createClient()
  const limite24h  = new Date(Date.now() - 24  * 3_600_000).toISOString()
  const limite30d  = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [
    { data: zerados },
    { data: baixo },
    { data: pendentesAntigos },
    { data: produtosAtivos },
    { data: pedidosRecentes30d },
  ] = await Promise.all([
    supabase.from('products').select('id, name, stock')
      .eq('active', true).eq('stock', 0),

    supabase.from('products').select('id, name, stock')
      .eq('active', true).gt('stock', 0).lte('stock', 5),

    supabase.from('orders')
      .select('id, order_number, customer_name, created_at')
      .eq('order_status', 'pending')
      .lt('created_at', limite24h)
      .order('created_at', { ascending: true }),

    supabase.from('products')
      .select('id, name, stock')
      .eq('active', true),

    supabase.from('orders')
      .select('items')
      .gte('created_at', limite30d)
      .in('order_status', ['paid', 'preparing', 'shipped', 'delivered']),
  ])

  // Descobre quais produtos tiveram pelo menos uma venda no periodo
  const idsComVenda = new Set<string>()
  for (const pedido of pedidosRecentes30d ?? []) {
    for (const item of (pedido.items as OrderItem[]) ?? []) {
      if (item.product_id) idsComVenda.add(item.product_id)
    }
  }
  const semVenda = (produtosAtivos ?? []).filter(p => !idsComVenda.has(p.id))

  // Calcula quantas horas cada pedido pendente esta aguardando
  const agora = Date.now()
  const pendentesComHoras: PedidoPendente[] = (pendentesAntigos ?? []).map(p => ({
    id:               p.id,
    order_number:     p.order_number,
    customer_name:    p.customer_name,
    created_at:       p.created_at,
    horas_aguardando: Math.floor((agora - new Date(p.created_at).getTime()) / 3_600_000),
  }))

  return {
    estoque: {
      zerados: (zerados ?? []) as ProdutoAlerta[],
      baixo:   (baixo   ?? []) as ProdutoAlerta[],
    },
    pedidosPendentesAntigos: pendentesComHoras,
    produtosSemVenda30d:     semVenda as ProdutoAlerta[],
  }
}
// =============================================================================

// Nao tem tabela de clientes separada — tudo vem de orders.
// Classificacao calculada com base no historico completo:
//   VIP        = top 20% por total gasto
//   Recorrente = 2+ pedidos e ativo nos ultimos 60 dias
//   Inativo    = ultima compra ha mais de 60 dias
//   Novo       = 1 pedido recente
export async function buscarClientesAgregados(): Promise<ClienteResumo[]> {
  const supabase  = await createClient()
  const limite60d = new Date(Date.now() - 60 * 86_400_000).toISOString()

  const { data: pedidos } = await supabase
    .from('orders')
    .select('customer_phone, customer_name, customer_email, total, created_at')
    .not('order_status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })

  if (!pedidos || pedidos.length === 0) return []

  // Agrupar por telefone (chave natural de cliente no sistema)
  const mapa = new Map<string, {
    nome: string; email: string | null
    gastoTotal: number; pedidos: number; ultimaCompra: string
  }>()

  for (const p of pedidos) {
    const tel = p.customer_phone ?? 'desconhecido'
    const existente = mapa.get(tel)
    if (existente) {
      existente.gastoTotal += Number(p.total)
      existente.pedidos    += 1
      // pedidos ja vem ordenados por data desc, entao o primeiro e o mais recente
    } else {
      mapa.set(tel, {
        nome:        p.customer_name,
        email:       p.customer_email ?? null,
        gastoTotal:  Number(p.total),
        pedidos:     1,
        ultimaCompra: p.created_at,
      })
    }
  }

  const lista = Array.from(mapa.entries())
    .map(([tel, val]) => ({ tel, ...val }))
    .sort((a, b) => b.gastoTotal - a.gastoTotal)

  // Top 20% por gasto = VIP
  const corteVip = Math.ceil(lista.length * 0.2)

  return lista.map((c, index): ClienteResumo => {
    const inativo = c.ultimaCompra < limite60d

    let classificacao: ClienteResumo['classificacao']
    if (index < corteVip)    classificacao = 'VIP'
    else if (inativo)        classificacao = 'Inativo'
    else if (c.pedidos >= 2) classificacao = 'Recorrente'
    else                     classificacao = 'Novo'

    return {
      customer_phone: c.tel,
      customer_name:  c.nome,
      customer_email: c.email,
      total_gasto:    Number(c.gastoTotal.toFixed(2)),
      total_pedidos:  c.pedidos,
      ultima_compra:  c.ultimaCompra,
      classificacao,
    }
  })
}
