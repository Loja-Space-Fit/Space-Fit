'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { useAuth } from '@/context/AuthContext'
import { ShoppingCart, Menu, X, User, LogOut, Package, ChevronDown, LayoutDashboard, ChevronRight, MessageCircle, Heart, Tag, Dumbbell, Building2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Category } from '@/types'

export default function Cabecalho() {
  const { totalItems, openCart }    = useCart()
  const { user: usuarioLogado, profile: perfil, signOut: sair } = useAuth()
  const paginaAtual                 = usePathname()
  const [menuMobileAberto, setMenuMobileAberto]     = useState(false)
  const [menuUsuarioAberto, setMenuUsuarioAberto]   = useState(false)
  const [categorias, setCategorias]                 = useState<Category[]>([])
  const refMenuUsuario = useRef<HTMLDivElement>(null)
  const refCatBar      = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('categories').select('id, name, slug, display_order').eq('active', true).order('display_order')
      .then(({ data }) => setCategorias((data || []) as Category[]))
  }, [])

  // Fecha o dropdown do usuário ao clicar fora dele
  useEffect(() => {
    function fecharAoClicarFora(evento: MouseEvent) {
      if (refMenuUsuario.current && !refMenuUsuario.current.contains(evento.target as Node)) {
        setMenuUsuarioAberto(false)
      }
    }
    document.addEventListener('mousedown', fecharAoClicarFora)
    return () => document.removeEventListener('mousedown', fecharAoClicarFora)
  }, [])

  // Bloqueia scroll do body quando menu mobile está aberto
  useEffect(() => {
    document.body.style.overflow = menuMobileAberto ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuMobileAberto])

  // Fecha o menu mobile automaticamente ao navegar para outra página
  useEffect(() => { setMenuMobileAberto(false) }, [paginaAtual])

  function ehPaginaAtiva(href: string) {
    if (href === '/') return paginaAtual === '/'
    return paginaAtual.startsWith(href)
  }

  function scrollCats(dir: 'left' | 'right') {
    refCatBar.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })
  }

  const primeiroNome = perfil?.full_name?.split(' ')[0] || 'Conta'

  return (
    <header className={`sticky top-0 z-50 bg-[#0a0a0a]/95 ${(menuMobileAberto || menuUsuarioAberto) ? '' : 'backdrop-blur-md'} border-b border-[#b2ea0f]/10 shadow-[0_4px_30px_rgba(0,0,0,0.6)]`}>
      {/* === BARRA PRINCIPAL === */}
      <div className="max-w-7xl mx-auto px-4 h-[72px] flex items-center justify-between gap-6">

        {/* Logo + WhatsApp */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center">
            <Image src="/imagens/logo.png" alt="Space Fit" width={420} height={160} className="h-14 md:h-16 w-auto" />
          </Link>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP || '5534998853794'}?text=${encodeURIComponent('Olá! Vim pelo site da Space Fit e preciso de ajuda.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-[#b2ea0f]/10 border border-[#b2ea0f]/30 text-[#b2ea0f] hover:bg-[#b2ea0f] hover:text-black transition-all duration-200 shadow-[0_0_10px_rgba(178,234,15,0.2)] hover:shadow-[0_0_16px_rgba(178,234,15,0.4)]"
            aria-label="Falar no WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>

        {/* Ações do lado direito */}
        <div className="flex items-center gap-2">
          {usuarioLogado ? (
            <div className="relative" ref={refMenuUsuario}>
              <button
                onClick={() => setMenuUsuarioAberto(aberto => !aberto)}
                className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#b2ea0f]/30 transition-all duration-200 text-sm font-semibold text-white"
              >
                <span className="w-6 h-6 rounded-full bg-[#b2ea0f] flex items-center justify-center text-black shrink-0">
                  <User className="w-3.5 h-3.5" />
                </span>
                <span className="hidden sm:inline max-w-[80px] truncate">{primeiroNome}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-[#9ca3af] transition-transform duration-200 ${menuUsuarioAberto ? 'rotate-180' : ''}`} />
              </button>

              {menuUsuarioAberto && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#111] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-y-auto max-h-[calc(100vh-80px)] z-50">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-xs text-[#9ca3af]">Logado como</p>
                    <p className="text-sm text-white font-semibold truncate">{primeiroNome}</p>
                  </div>
                  <Link href="/minha-conta" onClick={() => setMenuUsuarioAberto(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#d1d5db] hover:text-white hover:bg-white/5 transition-colors">
                    <User className="w-4 h-4 text-[#b2ea0f]" /> Minha Conta
                  </Link>
                  <Link href="/minha-conta?tab=pedidos" onClick={() => setMenuUsuarioAberto(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#d1d5db] hover:text-white hover:bg-white/5 transition-colors">
                    <Package className="w-4 h-4 text-[#b2ea0f]" /> Meus Pedidos
                  </Link>
                  <Link href="/minha-conta?tab=favoritos" onClick={() => setMenuUsuarioAberto(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#d1d5db] hover:text-white hover:bg-white/5 transition-colors">
                    <Heart className="w-4 h-4 text-[#b2ea0f]" /> Meus Favoritos
                  </Link>
                  {perfil?.is_admin && (
                    <Link href="/admin" onClick={() => setMenuUsuarioAberto(false)} className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#b2ea0f] hover:text-[#c8f040] hover:bg-[#b2ea0f]/5 transition-colors font-semibold">
                      <LayoutDashboard className="w-4 h-4" /> Painel Admin
                    </Link>
                  )}
                  <div className="border-t border-white/5">
                    <button
                      onClick={() => { sair(); setMenuUsuarioAberto(false) }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sair da conta
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#b2ea0f]/30 text-sm font-semibold text-[#d1d5db] hover:text-white transition-all duration-200">
              <User className="w-4 h-4" /> Entrar
            </Link>
          )}

          {/* Carrinho */}
          <button
            onClick={openCart}
            className={`relative flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-200 ${
              totalItems > 0
                ? 'border-[#b2ea0f]/50 bg-[#b2ea0f]/10 text-[#b2ea0f] hover:bg-[#b2ea0f]/20 shadow-[0_0_14px_rgba(178,234,15,0.25)]'
                : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#b2ea0f]/30 text-[#9ca3af] hover:text-white'
            }`}
            aria-label="Abrir carrinho"
          >
            <ShoppingCart className="w-[18px] h-[18px]" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#b2ea0f] text-black text-[10px] font-black min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center leading-none px-1">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </button>

          {/* Hamburguer mobile */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-[#9ca3af] hover:text-white transition-all duration-200"
            onClick={() => setMenuMobileAberto(aberto => !aberto)}
            aria-label={menuMobileAberto ? 'Fechar menu' : 'Abrir menu'}
          >
            {menuMobileAberto ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {/* === BARRA DE CATEGORIAS (desktop) === */}
      {(categorias.length > 0) && (
        <div className="hidden md:block bg-[#0d0d0d]">
          <div className="relative max-w-7xl mx-auto">
            <button
              onClick={() => scrollCats('left')}
              className="absolute left-0 top-0 bottom-0 z-10 flex items-center px-2 bg-gradient-to-r from-[#0d0d0d] to-transparent text-[#444] hover:text-white transition-colors"
              aria-label="Rolar esquerda"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>

            <div
              ref={refCatBar}
              className="flex items-center gap-1 overflow-x-auto scrollbar-none px-6 py-2.5 scroll-smooth"
              style={{ scrollbarWidth: 'none' }}
            >
              {categorias.map(cat => {
                const ativo = paginaAtual.startsWith(`/categoria/${cat.slug}`)
                return (
                  <Link
                    key={cat.id}
                    href={`/categoria/${cat.slug}`}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                      ativo
                        ? 'bg-[#b2ea0f] text-black shadow-[0_0_14px_rgba(178,234,15,0.4)]'
                        : 'text-[#6b7280] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {cat.name}
                  </Link>
                )
              })}
              <span className="w-px h-4 bg-white/10 mx-2 shrink-0" />
              {/* Link fixo de Kits & Combos */}
              <Link
                href="/kits"
                className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                  paginaAtual.startsWith('/kits')
                    ? 'bg-[#b2ea0f] text-black shadow-[0_0_14px_rgba(178,234,15,0.4)]'
                    : 'text-[#6b7280] hover:text-white hover:bg-white/10'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${paginaAtual.startsWith('/kits') ? 'bg-black' : 'bg-[#b2ea0f]'}`} />
                Kits &amp; Combos
              </Link>
              {/* Link fixo de Ofertas */}
              <Link
                href="/ofertas"
                className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                  paginaAtual.startsWith('/ofertas')
                    ? 'bg-[#b2ea0f] text-black shadow-[0_0_14px_rgba(178,234,15,0.4)]'
                    : 'text-[#6b7280] hover:text-white hover:bg-white/10'
                }`}
              >
                <Tag className={`w-3.5 h-3.5 shrink-0 ${paginaAtual.startsWith('/ofertas') ? 'text-black' : 'text-[#b2ea0f]'}`} />
                Ofertas
              </Link>
              {/* Link fixo de Planos */}
              <Link
                href="/planos"
                className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                  paginaAtual.startsWith('/planos')
                    ? 'bg-[#b2ea0f] text-black shadow-[0_0_14px_rgba(178,234,15,0.4)]'
                    : 'text-[#6b7280] hover:text-white hover:bg-white/10'
                }`}
              >
                <Dumbbell className={`w-3.5 h-3.5 shrink-0 ${paginaAtual.startsWith('/planos') ? 'text-black' : 'text-[#b2ea0f]'}`} />
                Planos
              </Link>
              {/* Link fixo de Franquias */}
              <Link
                href="/franquias"
                className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide whitespace-nowrap transition-all ${
                  paginaAtual.startsWith('/franquias')
                    ? 'bg-[#b2ea0f] text-black shadow-[0_0_14px_rgba(178,234,15,0.4)]'
                    : 'text-[#6b7280] hover:text-white hover:bg-white/10'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 shrink-0 ${paginaAtual.startsWith('/franquias') ? 'text-black' : 'text-[#b2ea0f]'}`} />
                Franquias
              </Link>
            </div>

            <button
              onClick={() => scrollCats('right')}
              className="absolute right-0 top-0 bottom-0 z-10 flex items-center px-2 bg-gradient-to-l from-[#0d0d0d] to-transparent text-[#444] hover:text-white transition-colors"
              aria-label="Rolar direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* === MENU MOBILE — overlay tela cheia (backdrop-blur removido do header quando aberto para fixed funcionar) === */}
      {menuMobileAberto && (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0a] overflow-y-auto">
          {/* Topo com logo e botão fechar */}
          <div className="flex items-center justify-between px-4 h-[72px] border-b border-white/5 shrink-0">
            <span className="text-[#b2ea0f] font-black text-xl tracking-widest">SPACE FIT</span>
            <button
              onClick={() => setMenuMobileAberto(false)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 text-white"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 py-4 flex flex-col gap-1">

          {/* Categorias no mobile */}
          {categorias.map(cat => (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 ${
                ehPaginaAtiva(`/categoria/${cat.slug}`)
                  ? 'bg-[#b2ea0f]/10 text-[#b2ea0f] border border-[#b2ea0f]/20'
                  : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.name}
              {ehPaginaAtiva(`/categoria/${cat.slug}`) && <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f]" />}
            </Link>
          ))}
          {/* Kits & Combos no mobile */}
          <Link
            href="/kits"
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 ${
              paginaAtual.startsWith('/kits')
                ? 'bg-[#b2ea0f]/10 text-[#b2ea0f] border border-[#b2ea0f]/20'
                : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
            }`}
          >
            Kits &amp; Combos
            {paginaAtual.startsWith('/kits') && <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f]" />}
          </Link>
          {/* Ofertas no mobile */}
          <Link
            href="/ofertas"
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 ${
              paginaAtual.startsWith('/ofertas')
                ? 'bg-[#b2ea0f]/10 text-[#b2ea0f] border border-[#b2ea0f]/20'
                : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#b2ea0f]" /> Ofertas
            </span>
            {paginaAtual.startsWith('/ofertas') && <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f]" />}
          </Link>
          {/* Planos no mobile */}
          <Link
            href="/planos"
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 ${
              paginaAtual.startsWith('/planos')
                ? 'bg-[#b2ea0f]/10 text-[#b2ea0f] border border-[#b2ea0f]/20'
                : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#b2ea0f]" /> Planos
            </span>
            {paginaAtual.startsWith('/planos') && <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f]" />}
          </Link>
          {/* Franquias no mobile */}
          <Link
            href="/franquias"
            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150 ${
              paginaAtual.startsWith('/franquias')
                ? 'bg-[#b2ea0f]/10 text-[#b2ea0f] border border-[#b2ea0f]/20'
                : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#b2ea0f]" /> Franquias
            </span>
            {paginaAtual.startsWith('/franquias') && <span className="w-1.5 h-1.5 rounded-full bg-[#b2ea0f]" />}
          </Link>

          <div className="border-t border-white/5 mt-2 pt-2 flex flex-col gap-1">
            {usuarioLogado ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3 mb-1">
                  <span className="w-8 h-8 rounded-full bg-[#b2ea0f] flex items-center justify-center text-black shrink-0">
                    <User className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-xs text-[#9ca3af]">Logado como</p>
                    <p className="text-sm text-white font-semibold">{primeiroNome}</p>
                  </div>
                </div>
                <Link href="/minha-conta" className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold text-[#9ca3af] hover:text-white hover:bg-white/5 transition-colors">
                  <User className="w-4 h-4 text-[#b2ea0f]" /> Minha Conta
                </Link>
                <Link href="/minha-conta?tab=pedidos" className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold text-[#9ca3af] hover:text-white hover:bg-white/5 transition-colors">
                  <Package className="w-4 h-4 text-[#b2ea0f]" /> Meus Pedidos
                </Link>
                <Link href="/minha-conta?tab=favoritos" className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold text-[#9ca3af] hover:text-white hover:bg-white/5 transition-colors">
                  <Heart className="w-4 h-4 text-[#b2ea0f]" /> Meus Favoritos
                </Link>
                {perfil?.is_admin && (
                  <Link href="/admin" className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold text-[#b2ea0f] hover:text-[#c8f040] hover:bg-[#b2ea0f]/5 transition-colors">
                    <LayoutDashboard className="w-4 h-4" /> Painel Admin
                  </Link>
                )}
                <button
                  onClick={() => { sair(); setMenuMobileAberto(false) }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" /> Sair da conta
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#b2ea0f] text-black text-sm font-bold hover:bg-[#c8f040] transition-colors"
              >
                <User className="w-4 h-4" /> Entrar / Cadastrar
              </Link>
            )}
          </div>
          </div>
        </div>
      )}
    </header>
  )
}
