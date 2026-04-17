'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

const LABELS: Record<number, string> = {
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Muito bom',
}

interface Props {
  productId: string
}

export default function ReviewForm({ productId }: Props) {
  const { user, profile } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [rating, setRating]   = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  useEffect(() => setMounted(true), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { toast.error('Selecione uma avaliação.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, rating, comment }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Erro ao enviar.'); return }
      setSent(true)
      toast.success('Avaliação enviada! Aguardando aprovação.')
    } catch {
      toast.error('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  if (sent) {
    return (
      <div className="p-6 bg-[#111111] rounded-xl border border-[#b2ea0f]/30 text-center">
        <p className="text-[#b2ea0f] font-bold text-lg mb-1">Obrigado pela avaliação!</p>
        <p className="text-sm text-[#9ca3af]">Sua avaliação será exibida após aprovação.</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6 bg-[#111111] rounded-xl border border-[#2a2a2a] text-center">
        <p className="text-[#9ca3af] text-sm">
          <a href="/login" className="text-[#b2ea0f] font-semibold hover:underline">Faça login</a> para deixar uma avaliação.
        </p>
      </div>
    )
  }

  const active = hovered || rating

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-[#111111] rounded-xl border border-[#2a2a2a] space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-white uppercase tracking-wide">Deixe sua avaliação</h3>
        <span className="text-sm text-[#9ca3af]">Como <span className="text-white font-semibold">{profile?.full_name || user.email}</span></span>
      </div>

      {/* Estrelas */}
      <div>
        <p className="text-sm text-[#9ca3af] mb-2">Sua nota *</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              className="focus:outline-none transition-transform hover:scale-110"
              aria-label={LABELS[s]}
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  s <= active
                    ? 'fill-[#b2ea0f] text-[#b2ea0f]'
                    : 'text-[#2a2a2a] hover:text-[#b2ea0f]'
                }`}
              />
            </button>
          ))}
          {active > 0 && (
            <span className="ml-2 text-sm font-semibold text-[#b2ea0f]">{LABELS[active]}</span>
          )}
        </div>
      </div>

      {/* Comentário */}
      <div>
        <label className="text-sm text-[#9ca3af] mb-1 block">Comentário <span className="text-[#555]">(opcional)</span></label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Conte sua experiência com o produto..."
          maxLength={1000}
          rows={3}
          className="input resize-none"
        />
        <p className="text-xs text-[#555] mt-1 text-right">{comment.length}/1000</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-green w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Enviando...' : 'Enviar avaliação'}
      </button>

      <p className="text-xs text-[#555] text-center">
        Avaliações passam por moderação antes de serem publicadas.
      </p>
    </form>
  )
}
