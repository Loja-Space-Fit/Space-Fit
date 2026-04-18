'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatBRL } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  User, Phone, Mail, MapPin, CreditCard, Zap,
  Store, ChevronRight, Loader2, ShoppingBag, CheckCircle2, AlertCircle, Tag, Star, X,
} from 'lucide-react'
import type { Coupon } from '@/types'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  customer_name:  z.string().min(2, 'Nome obrigatório'),
  customer_phone: z.string().min(10, 'Telefone obrigatório'),
  customer_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  delivery_type:  z.enum(['delivery', 'pickup']),
  cep:            z.string().optional(),
  street:         z.string().optional(),
  number:         z.string().optional(),
  complement:     z.string().optional(),
  neighborhood:   z.string().optional(),
  city:           z.string().optional(),
  state:          z.string().optional(),
  payment_method: z.enum(['pix', 'credit_card', 'pickup']),
})

type FormData = z.infer<typeof schema>

export default function CheckoutPage() {
  const { items, subtotal, discount, total, coupon, couponCode, setCoupon, removeCoupon, clearCart } = useCart()
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addressError, setAddressError] = useState('')
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')

  // Cupom
  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  // Space Points
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [pointsToUse, setPointsToUse] = useState(0)
  const [usePoints, setUsePoints] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delivery_type: 'delivery', payment_method: 'credit_card' },
  })

  const buscarCep = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) { setCepStatus('idle'); return }
    setCepStatus('loading')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) {
        setCepStatus('error')
        form.setValue('street', '')
        form.setValue('neighborhood', '')
        form.setValue('city', '')
        form.setValue('state', '')
      } else {
        setCepStatus('ok')
        form.setValue('street',       data.logradouro || '')
        form.setValue('neighborhood', data.bairro     || '')
        form.setValue('city',         data.localidade || '')
        form.setValue('state',        data.uf         || '')
        form.setValue('cep',          digits)
      }
    } catch {
      setCepStatus('error')
    }
  }, [form])

  // Buscar pontos do cliente
  useEffect(() => {
    if (user && profile?.phone) {
      const supabase = createClient()
      supabase.from('loyalty_accounts').select('points').eq('customer_phone', profile.phone).single()
        .then(({ data }) => setLoyaltyPoints(data?.points ?? 0))
    }
  }, [user, profile])

  // Redirecionar para login se não autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/checkout&message=login-required')
    }
  }, [authLoading, user, router])

  // Pré-preencher com dados do perfil se logado
  useEffect(() => {
    if (profile) {
      if (profile.full_name)  form.setValue('customer_name',  profile.full_name)
      if (profile.phone)      form.setValue('customer_phone', profile.phone)
      if (user?.email)        form.setValue('customer_email', user.email)
      const addr = profile.address as Record<string, string> | null
      if (addr) {
        if (addr.street)       form.setValue('street',       addr.street)
        if (addr.number)       form.setValue('number',       addr.number)
        if (addr.neighborhood) form.setValue('neighborhood', addr.neighborhood)
        if (addr.city)         form.setValue('city',         addr.city)
        if (addr.state)        form.setValue('state',        addr.state)
        if (addr.cep) {
          form.setValue('cep', addr.cep)
          buscarCep(addr.cep)
        }
      }
    }
  }, [profile, user, form])

  const deliveryType   = form.watch('delivery_type')
  const paymentMethod  = form.watch('payment_method')

  const pointsDiscount = usePoints ? pointsToUse : 0
  const finalTotal     = Math.max(0, total - pointsDiscount)

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError('')
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim().toUpperCase(), subtotal }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCouponError(data.error || 'Cupom inválido')
      } else {
        setCoupon(data.coupon as Coupon, couponInput.trim().toUpperCase())
        setCouponInput('')
      }
    } catch {
      setCouponError('Erro ao verificar cupom. Tente novamente.')
    } finally {
      setCouponLoading(false)
    }
  }

  if (!items.length) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-[#9ca3af] mx-auto mb-4 opacity-30" />
        <h1 className="text-2xl font-black text-white mb-2">Carrinho vazio</h1>
        <p className="text-[#9ca3af] mb-6">Adicione produtos antes de finalizar a compra.</p>
        <a href="/" className="btn-green">Ver Produtos</a>
      </div>
    )
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError('')
    try {
      const orderItems = items.map(i => ({
        product_id:    i.product_id,
        product_name:  i.product_name,
        product_image: i.product_image,
        size:          i.size,
        quantity:      i.quantity,
        unit_price:    i.unit_price,
        total_price:   i.unit_price * i.quantity,
      }))

      const address = data.delivery_type === 'delivery' ? {
        cep:          data.cep,
        street:       data.street,
        number:       data.number,
        complement:   data.complement,
        neighborhood: data.neighborhood,
        city:         data.city,
        state:        data.state,
      } : null

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name:  data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email,
          address,
          items:          orderItems,
          subtotal,
          discount,
          total:          finalTotal,
          payment_method: data.delivery_type === 'pickup' ? 'pickup' : data.payment_method,
          coupon_code:    couponCode || undefined,
          points_to_use:  pointsToUse,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erro ao criar pedido')

      clearCart()
      if (result.payment_url) {
        window.location.href = result.payment_url
      } else if (result.order_id) {
        // Apenas pickup vai para confirmado sem pagamento MP
        router.push(`/pedido-confirmado/${result.order_id}`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl md:text-3xl font-black text-white uppercase mb-8">
        Finalizar <span className="text-[#b2ea0f]">Compra</span>
      </h1>

      {/* Indicador de etapas */}
      <div className="flex items-center gap-2 mb-8">
        {['Dados', 'Entrega', 'Pagamento'].map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
              step > i + 1 ? 'bg-[#b2ea0f] text-black' :
              step === i + 1 ? 'bg-[#b2ea0f] text-black' : 'bg-[#2a2a2a] text-[#9ca3af]'
            }`}>{i + 1}</div>
            <span className={`text-sm font-semibold ${step === i + 1 ? 'text-white' : 'text-[#9ca3af]'}`}>{label}</span>
            {i < 2 && <ChevronRight className="w-4 h-4 text-[#2a2a2a]" />}
          </div>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário */}
          <div className="lg:col-span-2 space-y-6">

            {/* ETAPA 1: Dados pessoais */}
            {step >= 1 && (
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
                <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#b2ea0f]" /> Seus Dados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[#9ca3af] mb-1 block">Nome completo *</label>
                    <input {...form.register('customer_name')} placeholder="Seu nome" className="input" />
                    {form.formState.errors.customer_name && (
                      <p className="text-red-400 text-xs mt-1">{form.formState.errors.customer_name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-[#9ca3af] mb-1 block">WhatsApp / Telefone *</label>
                    <input {...form.register('customer_phone')} placeholder="(34) 99999-9999" className="input" />
                    {form.formState.errors.customer_phone && (
                      <p className="text-red-400 text-xs mt-1">{form.formState.errors.customer_phone.message}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-[#9ca3af] mb-1 block">E-mail (opcional)</label>
                    <input {...form.register('customer_email')} type="email" placeholder="seu@email.com" className="input" />
                  </div>
                </div>
                {step === 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-green mt-4"
                  >
                    Continuar para Entrega
                  </button>
                )}
              </div>
            )}

            {/* ETAPA 2: Entrega */}
            {step >= 2 && (
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
                <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#b2ea0f]" /> Entrega
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => form.setValue('delivery_type', 'delivery')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      deliveryType === 'delivery' ? 'border-[#b2ea0f] bg-[#b2ea0f]/10' : 'border-[#2a2a2a]'
                    }`}
                  >
                    <p className="font-bold text-white">Entrega</p>
                    <p className="text-xs text-[#9ca3af] mt-0.5">Recebo em casa (a combinar)</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { form.setValue('delivery_type', 'pickup'); form.setValue('payment_method', 'pickup') }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      deliveryType === 'pickup' ? 'border-[#b2ea0f] bg-[#b2ea0f]/10' : 'border-[#2a2a2a]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-[#b2ea0f]" />
                      <p className="font-bold text-white">Retirar na Academia</p>
                    </div>
                    <p className="text-xs text-[#9ca3af] mt-0.5">Grátis — Combine por WhatsApp</p>
                  </button>
                </div>

                {deliveryType === 'delivery' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* CEP com busca automática */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-sm text-[#9ca3af] mb-1 block">CEP *</label>
                      <div className="relative">
                        <input
                          {...form.register('cep')}
                          placeholder="00000-000"
                          className="input pr-8"
                          maxLength={9}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '')
                            const formatted = v.length > 5 ? `${v.slice(0,5)}-${v.slice(5,8)}` : v
                            form.setValue('cep', formatted)
                            if (v.length === 8) buscarCep(v)
                            else setCepStatus('idle')
                          }}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          {cepStatus === 'loading' && <Loader2 className="w-4 h-4 text-[#9ca3af] animate-spin" />}
                          {cepStatus === 'ok'      && <CheckCircle2 className="w-4 h-4 text-[#b2ea0f]" />}
                          {cepStatus === 'error'   && <AlertCircle  className="w-4 h-4 text-red-400" />}
                        </span>
                      </div>
                      {cepStatus === 'error' && (
                        <p className="text-red-400 text-xs mt-1">CEP não encontrado. Verifique e tente novamente.</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="text-sm text-[#9ca3af] mb-1 block">Rua *</label>
                      <input
                        {...form.register('street')}
                        placeholder="Nome da rua"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-[#9ca3af] mb-1 block">Número *</label>
                      <input {...form.register('number')} placeholder="123" className="input" />
                    </div>
                    <div>
                      <label className="text-sm text-[#9ca3af] mb-1 block">Complemento</label>
                      <input {...form.register('complement')} placeholder="Apto, bloco..." className="input" />
                    </div>
                    <div>
                      <label className="text-sm text-[#9ca3af] mb-1 block">Bairro *</label>
                      <input
                        {...form.register('neighborhood')}
                        placeholder="Bairro"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-[#9ca3af] mb-1 block">Cidade *</label>
                      <input
                        {...form.register('city')}
                        placeholder="Preenchida automaticamente"
                        className="input"
                        readOnly={cepStatus === 'ok'}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-[#9ca3af] mb-1 block">Estado *</label>
                      <input
                        {...form.register('state')}
                        placeholder="UF"
                        className="input"
                        maxLength={2}
                        readOnly={cepStatus === 'ok'}
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="flex flex-col gap-3 mt-4">
                    {addressError && (
                      <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                        {addressError}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(1)} className="btn-outline">
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (deliveryType === 'delivery') {
                            if (cepStatus === 'error' || cepStatus === 'idle') {
                              setAddressError('Digite um CEP válido para continuar.')
                              return
                            }
                            if (cepStatus === 'loading') {
                              setAddressError('Aguarde a validação do CEP.')
                              return
                            }
                            const v = form.getValues()
                            const letras = (s: string) => (s ?? '').replace(/[^a-zA-ZÀ-ú]/g, '')
                            if (letras(v.street ?? '').length < 3) {
                              setAddressError('Digite um nome de rua válido.')
                              return
                            }
                            if (!v.number || !/\d/.test(v.number)) {
                              setAddressError('Digite um número válido para o endereço.')
                              return
                            }
                            if (letras(v.neighborhood ?? '').length < 3) {
                              setAddressError('Digite um nome de bairro válido.')
                              return
                            }
                          }
                          setAddressError('')
                          setStep(3)
                        }}
                        className="btn-green"
                      >
                        Continuar para Pagamento
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 3: Pagamento */}
            {step >= 3 && (
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
                <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#b2ea0f]" /> Pagamento
                </h2>

                {deliveryType === 'pickup' ? (
                  <div className="p-4 bg-[#b2ea0f]/10 border border-[#b2ea0f]/30 rounded-xl text-sm text-[#d1d5db]">
                    <p className="font-bold text-[#b2ea0f]">Pagamento na Academia</p>
                    <p className="mt-1">Pague na hora da retirada (dinheiro, Pix ou cartão).</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Botão único MP */}
                    <div className="p-4 rounded-xl border-2 border-[#b2ea0f] bg-[#b2ea0f]/10 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#b2ea0f]/20 flex items-center justify-center shrink-0">
                        <CreditCard className="w-5 h-5 text-[#b2ea0f]" />
                      </div>
                      <div>
                        <p className="font-bold text-white">Pagar com Mercado Pago</p>
                        <p className="text-xs text-[#9ca3af]">PIX, cartão, boleto e mais • com ou sem conta</p>
                      </div>
                    </div>

                    {/* Resumo dos itens antes de ir ao MP */}
                    <div className="pt-3 border-t border-[#2a2a2a]">
                      <p className="text-xs text-[#9ca3af] font-bold uppercase tracking-wide mb-3">O que você está comprando</p>
                      <div className="space-y-2">
                        {items.map(item => (
                          <div key={`${item.product_id}-${item.size || ''}`} className="flex items-center gap-3">
                            {item.product_image && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#2a2a2a] shrink-0">
                                <Image src={item.product_image} alt={item.product_name} width={40} height={40} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white font-semibold truncate">{item.product_name}</p>
                              <p className="text-xs text-[#9ca3af]">
                                Qtd: {item.quantity}{item.size ? ` • Tam: ${item.size}` : ''}
                              </p>
                            </div>
                            <p className="text-xs font-bold text-[#b2ea0f] shrink-0">{formatBRL(item.unit_price * item.quantity)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-800 text-red-400 text-sm">
                    {error}
                  </p>
                )}

                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setStep(2)} className="btn-outline">
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-green flex-1"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                    ) : (
                      `Confirmar Pedido — ${formatBRL(finalTotal)}`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resumo do pedido */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
              <h3 className="font-black text-white mb-4">Resumo do Pedido</h3>
              <div className="space-y-3 mb-4">
                {items.map(item => {
                  const key = `${item.product_id}-${item.size || ''}`
                  return (
                    <div key={key} className="flex items-start gap-3">
                      {item.product_image && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#2a2a2a] shrink-0">
                          <Image src={item.product_image} alt={item.product_name} width={48} height={48} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-semibold truncate">{item.product_name}</p>
                        {item.size && <p className="text-xs text-[#9ca3af]">Tam: {item.size}</p>}
                        <p className="text-xs text-[#9ca3af]">Qtd: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-[#b2ea0f] shrink-0">
                        {formatBRL(item.unit_price * item.quantity)}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Cupom + Space Points */}
              <div className="border-t border-[#2a2a2a] pt-4 mt-2 space-y-4">
                {/* Cupom */}
                <div>
                  <p className="text-xs text-[#9ca3af] mb-2 font-bold uppercase tracking-wide">Cupom de desconto</p>
                  {coupon ? (
                    <div className="flex items-center justify-between p-3 bg-[#b2ea0f]/10 border border-[#b2ea0f]/30 rounded-xl">
                      <div className="flex items-center gap-2 text-[#b2ea0f] text-sm font-bold">
                        <Tag className="w-4 h-4" />
                        {couponCode} — {coupon.type === 'percent' ? `${coupon.value}% OFF` : `${formatBRL(coupon.value)} OFF`}
                      </div>
                      <button type="button" onClick={removeCoupon} className="text-[#9ca3af] hover:text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input
                          value={couponInput}
                          onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError('') }}
                          onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                          placeholder="Código do cupom"
                          className="input flex-1 text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={couponLoading}
                          className="btn-outline text-sm px-3 py-2 rounded-lg whitespace-nowrap"
                        >
                          {couponLoading ? '...' : 'Aplicar'}
                        </button>
                      </div>
                      {couponError && <p className="text-red-400 text-xs mt-1">{couponError}</p>}
                    </div>
                  )}
                </div>

                {/* Space Points */}
                <div>
                  <p className="text-xs text-[#9ca3af] mb-2 font-bold uppercase tracking-wide">Space Points</p>
                  <div className={`p-3 rounded-xl border transition-all ${
                    usePoints ? 'bg-[#b2ea0f]/10 border-[#b2ea0f]/40' : 'bg-[#1a1a1a] border-[#2a2a2a]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-[#b2ea0f]" />
                        <div>
                          <p className="text-sm font-bold text-white">{loyaltyPoints} pontos</p>
                          <p className="text-xs text-[#9ca3af]">
                            {loyaltyPoints > 0
                              ? usePoints
                                ? `Usando todos — desconto de ${formatBRL(pointsToUse)}`
                                : `Disponível: ${formatBRL(loyaltyPoints)} de desconto`
                              : 'Acumule 1% em cada compra'}
                          </p>
                        </div>
                      </div>
                      {loyaltyPoints > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = !usePoints
                            setUsePoints(next)
                            setPointsToUse(next ? Math.min(loyaltyPoints, Math.floor(total)) : 0)
                          }}
                          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                            usePoints ? 'bg-[#b2ea0f]' : 'bg-[#2a2a2a]'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                            usePoints ? 'left-4' : 'left-0.5'
                          }`} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#2a2a2a] pt-3 space-y-1">
                <div className="flex justify-between text-sm text-[#9ca3af]">
                  <span>Subtotal</span><span>{formatBRL(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-[#b2ea0f]">
                    <span>Desconto {coupon && `(${couponCode})`}</span>
                    <span>− {formatBRL(discount)}</span>
                  </div>
                )}
                {usePoints && pointsToUse > 0 && (
                  <div className="flex justify-between text-sm text-[#b2ea0f]">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Space Points</span>
                    <span>− {formatBRL(pointsToUse)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-white text-lg pt-2 border-t border-[#2a2a2a]">
                  <span>Total</span>
                  <span className="text-[#b2ea0f]">{formatBRL(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
