'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL } from '@/lib/utils'
import { Search } from 'lucide-react'

interface LoyaltyAccount {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  points: number
  total_spent: number
  created_at: string
}

interface LoyaltyTransaction {
  id: string
  points: number
  type: string
  description: string
  created_at: string
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}

export default function AdminLoyaltyPage() {
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([])
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([])
  const [selected, setSelected] = useState<LoyaltyAccount | null>(null)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from('loyalty_accounts').select('*').order('points', { ascending: false })
    setAccounts((data || []) as LoyaltyAccount[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function loadTransactions(account: LoyaltyAccount) {
    setSelected(account)
    const supabase = createClient()
    const { data } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setTransactions((data || []) as LoyaltyTransaction[])
  }

  const filtered = accounts.filter(a =>
    a.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.customer_phone?.includes(search)
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Space Points</h1>
        <p className="text-[#9ca3af] text-sm">{accounts.length} cliente{accounts.length !== 1 ? 's' : ''} no programa</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de clientes */}
        <div className="lg:col-span-2">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..." className="input pl-10" />
          </div>
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-xs text-[#9ca3af] uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-right px-5 py-3">Pontos</th>
                  <th className="text-right px-5 py-3">Total gasto</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3} className="py-10 text-center text-[#9ca3af]">Carregando...</td></tr>
                ) : filtered.map(a => (
                  <tr
                    key={a.id}
                    onClick={() => loadTransactions(a)}
                    className={`border-b border-[#1a1a1a] cursor-pointer transition-colors ${selected?.id === a.id ? 'bg-[#b2ea0f]/10' : 'hover:bg-[#1a1a1a]'}`}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-white">{a.customer_name}</p>
                      <p className="text-xs text-[#9ca3af]">{formatPhone(a.customer_phone)}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-bold text-[#b2ea0f]">{a.points.toLocaleString('pt-BR')} pts</span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-white">{formatBRL(a.total_spent)}</td>
                  </tr>
                ))}
                {!loading && !filtered.length && (
                  <tr><td colSpan={3} className="py-10 text-center text-[#9ca3af]">Nenhum resultado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Painel lateral de transações */}
        <div>
          <h2 className="text-sm font-bold text-[#9ca3af] uppercase tracking-wider mb-3">
            {selected ? `Histórico de ${selected.customer_name}` : 'Selecione um cliente'}
          </h2>
          {selected ? (
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[#2a2a2a] bg-[#b2ea0f]/10">
                <p className="text-3xl font-black text-[#b2ea0f]">{selected.points.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-[#9ca3af]">pontos acumulados</p>
              </div>
              <div className="divide-y divide-[#1a1a1a] max-h-[460px] overflow-y-auto">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-start gap-3 p-3">
                    <span className={`text-sm font-black shrink-0 ${t.points >= 0 ? 'text-[#b2ea0f]' : 'text-red-400'}`}>
                      {t.points >= 0 ? '+' : ''}{t.points}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{t.description || t.type}</p>
                      <p className="text-xs text-[#9ca3af]">{new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
                {!transactions.length && <p className="text-center py-8 text-sm text-[#9ca3af]">Sem transações</p>}
              </div>
            </div>
          ) : (
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-8 text-center text-[#9ca3af] text-sm">
              Clique em um cliente para ver o histórico de pontos
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
