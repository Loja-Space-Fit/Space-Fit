'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, ShoppingBag, Package,
  Tag, Megaphone, Star, Gift, Users, LogOut, Menu, X, MessageSquare,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/admin',               label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/pedidos',       label: 'Pedidos',     icon: ShoppingBag },
  { href: '/admin/produtos',      label: 'Produtos',    icon: Package },
  { href: '/admin/categorias',    label: 'Categorias',  icon: Tag },
  { href: '/admin/cupons',        label: 'Cupons',      icon: Gift },
  { href: '/admin/clientes',      label: 'Clientes',    icon: Users },
  { href: '/admin/conteudo',      label: 'Conteúdo',    icon: Megaphone },
  { href: '/admin/fidelidade',    label: 'Space Points', icon: Star },
  { href: '/admin/avaliacoes',    label: 'Avaliações',  icon: MessageSquare },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)
  const [pendentes, setPendentes] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    async function fetchPendentes() {
      const { count } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('approved', false)
      setPendentes(count ?? 0)
    }
    fetchPendentes()
  }, [])

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2a2a2a]">
        <Image src="/imagens/logo.png" alt="Space Fit" width={200} height={80} className="h-20 w-auto" />
        <p className="text-xs text-[#9ca3af] mt-1">Painel Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                isActive
                  ? 'bg-[#b2ea0f]/15 text-[#b2ea0f] border border-[#b2ea0f]/30'
                  : 'text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === '/admin/avaliacoes' && pendentes > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full text-[10px] font-black bg-yellow-400 text-black leading-none">
                  {pendentes > 9 ? '9+' : pendentes}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-[#2a2a2a]">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-[#9ca3af] hover:text-red-400 hover:bg-red-900/10 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 text-xs text-[#9ca3af] hover:text-[#b2ea0f] transition-colors mt-1"
        >
          ↗ Ver Loja
        </Link>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 bg-[#111111] border-r border-[#2a2a2a] min-h-screen flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#111111] border-b border-[#2a2a2a] h-14 flex items-center px-4">
        <button onClick={() => setOpen(v => !v)} className="text-white">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Image src="/imagens/logo.png" alt="Space Fit" width={160} height={56} className="ml-3 h-14 w-auto" />
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed top-0 left-0 z-50 h-full w-56 bg-[#111111] border-r border-[#2a2a2a] flex flex-col lg:hidden">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
