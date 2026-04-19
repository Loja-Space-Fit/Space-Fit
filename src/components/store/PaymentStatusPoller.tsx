'use client'

import { useEffect, useRef } from 'react'

interface Props {
  orderId: string
}

// Verifica a cada 5s se o status do pedido mudou para aprovado.
// Usado na página de pedido-confirmado para PIX e pagamentos pendentes.
export default function PaymentStatusPoller({ orderId }: Props) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attempts = useRef(0)
  const MAX_ATTEMPTS = 36 // 36 × 5s = 3 minutos

  useEffect(() => {
    timerRef.current = setInterval(async () => {
      attempts.current += 1
      if (attempts.current > MAX_ATTEMPTS) {
        clearInterval(timerRef.current!)
        return
      }

      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json() as { payment_status: string }
        if (data.payment_status === 'approved' || data.payment_status === 'rejected') {
          clearInterval(timerRef.current!)
          // Reload completo para garantir que o Server Component relê o banco sem cache
          window.location.reload()
        }
      } catch {
        // Silently ignore network errors, just retry
      }
    }, 5000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [orderId])

  return null
}
