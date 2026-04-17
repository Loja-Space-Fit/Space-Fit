import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  }
  return phone
}

// Calcula variacao percentual entre dois valores.
// Retorna undefined se o anterior for zero e o atual tambem for zero.
export function calcularVariacao(atual: number, anterior: number): number | undefined {
  if (anterior === 0) return atual > 0 ? 100 : undefined
  return Number((((atual - anterior) / anterior) * 100).toFixed(1))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function getWhatsAppLink(message: string): string {
  const number = process.env.NEXT_PUBLIC_WHATSAPP || '5534998853794'
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

export function getDiscount(price: number, comparePrice: number): number {
  if (!comparePrice || comparePrice <= price) return 0
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending:   'Pendente',
  paid:      'Pago',
  preparing: 'Preparando',
  shipped:   'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending:  'Aguardando',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  refunded: 'Estornado',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix:         'PIX',
  credit_card: 'Cartão de Crédito',
  pickup:      'Retirada na Academia',
}
