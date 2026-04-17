'use client'

import { MessageCircle } from 'lucide-react'

export default function WhatsAppButton() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP || '5534998853794'
  const message = 'Olá! Vim pelo site da Space Fit e preciso de ajuda.'

  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#b2ea0f] text-white shadow-lg hover:bg-[#8fbb00] transition-all hover:scale-110 animate-pulse-green"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="w-7 h-7 fill-current" />
    </a>
  )
}
