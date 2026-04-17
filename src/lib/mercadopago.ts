import MercadoPagoConfig, { Payment, Preference } from 'mercadopago'

// NUNCA expor o access token no frontend
// Esta função só funciona em Server Components e API Routes
export function getMercadoPagoClient() {
  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.')
  }
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000 },
  })
}

export function getPaymentClient() {
  return new Payment(getMercadoPagoClient())
}

export function getPreferenceClient() {
  return new Preference(getMercadoPagoClient())
}

// Formata valor em Real Brasileiro
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
