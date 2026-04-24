'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, slugify } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Loader2, Package } from 'lucide-react'
import type { Bundle, Product } from '@/types'

interface BundleItem {
  id: string
  product_id: string
  quantity: number
  product?: { name: string; price: number }
}

interface BundleWithItems extends Bundle {
  bundle_items?: BundleItem[]
}

export default function AdminKitsPage() {
  const [bundles, setBundles]   = useState<BundleWithItems[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBundle, setEditingBundle] = useState<BundleWithItems | null>(null)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ name: '', slug: '', description: '', price: '', image_url: '', active: true, stock: '999' })
  const [items, setItems]       = useState<{ product_id: string; quantity: number }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from('bundles').select('*, bundle_items(id, product_id, quantity, product:products(name, price))').order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, price').eq('active', true).order('name'),
    ])
    setBundles((b || []) as unknown as BundleWithItems[])
    setProducts((p || []) as unknown as Product[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditingBundle(null)
    setForm({ name: '', slug: '', description: '', price: '', image_url: '', active: true, stock: '999' })
    setItems([{ product_id: '', quantity: 1 }])
    setShowForm(true)
  }

  function openEdit(b: BundleWithItems) {
    setEditingBundle(b)
    setForm({ name: b.name, slug: b.slug, description: b.description || '', price: String(b.price), image_url: b.image_url || '', active: b.active, stock: String((b as BundleWithItems & { stock?: number }).stock ?? 999) })
    setItems(b.bundle_items?.map(i => ({ product_id: i.product_id, quantity: i.quantity })) || [])
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const bundleData = { name: form.name, slug: form.slug || slugify(form.name), description: form.description || null, price: parseFloat(form.price), image_url: form.image_url || null, active: form.active, stock: parseInt(form.stock) || 0 }

    let bundleId = editingBundle?.id
    if (editingBundle) {
      await supabase.from('bundles').update(bundleData).eq('id', editingBundle.id)
      await supabase.from('bundle_items').delete().eq('bundle_id', editingBundle.id)
    } else {
      const { data } = await supabase.from('bundles').insert(bundleData).select('id').single()
      bundleId = data?.id
    }

    const validItems = items.filter(i => i.product_id)
    if (bundleId && validItems.length > 0) {
      await supabase.from('bundle_items').insert(validItems.map(i => ({ bundle_id: bundleId, ...i })))
    }

    setShowForm(false)
    load()
    setSaving(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir o kit "${name}"?`)) return
    const supabase = createClient()
    await supabase.from('bundles').delete().eq('id', id)
    setBundles(prev => prev.filter(b => b.id !== id))
  }

  function addItem()    { setItems(prev => [...prev, { product_id: '', quantity: 1 }]) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Kits & Combos</h1>
          <p className="text-[#9ca3af] text-sm">{bundles.length} kit{bundles.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-green !px-3 !py-2 md:!px-5 md:!py-3 flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Novo Kit</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#111111] border border-[#2a2a2a] rounded-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <h2 className="font-black text-white">{editingBundle ? 'Editar Kit' : 'Novo Kit'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-[#9ca3af]" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Nome do Kit *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} required className="input" placeholder="Kit Iniciante" />
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Preço do Kit (R$) *</label>
                  <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required type="number" step="0.01" min="0" className="input" placeholder="199.90" />
                </div>
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Estoque disponível *</label>
                <input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} required type="number" min="0" className="input" placeholder="999" />
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input" rows={2} />
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">URL da imagem (opcional)</label>
                <input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} className="input" placeholder="https://..." />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-[#9ca3af]">Produtos do Kit</label>
                  <button type="button" onClick={addItem} className="text-xs text-[#b2ea0f]">+ Adicionar produto</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2">
                      <select value={item.product_id} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, product_id: e.target.value } : it))} className="input flex-1 text-sm">
                        <option value="">Selecionar produto...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} — {formatBRL(p.price)}</option>)}
                      </select>
                      <input value={item.quantity} onChange={e => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: parseInt(e.target.value) || 1 } : it))} type="number" min="1" className="input w-20 text-sm" />
                      <button type="button" onClick={() => removeItem(i)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a1a1a] text-red-400 hover:bg-red-900/20 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-[#b2ea0f]" />
                <span className="text-sm text-white">Kit ativo (visível na loja)</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-green flex-1">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : (editingBundle ? 'Salvar Alterações' : 'Criar Kit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-[#9ca3af]">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bundles.map(b => {
            const itemTotal = b.bundle_items?.reduce((s, i) => s + ((i.product as unknown as {price:number})?.price || 0) * i.quantity, 0) || 0
            return (
              <div key={b.id} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white">{b.name}</h3>
                    {b.description && <p className="text-sm text-[#9ca3af] mt-0.5">{b.description}</p>}
                  </div>
                  <span className={`badge ${b.active ? 'bg-[#b2ea0f]/20 text-[#b2ea0f]' : 'bg-[#2a2a2a] text-[#9ca3af]'}`}>
                    {b.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                {b.bundle_items && b.bundle_items.length > 0 && (
                  <ul className="space-y-1 mb-3">
                    {b.bundle_items.map(item => (
                      <li key={item.id} className="text-xs text-[#9ca3af] flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-[#b2ea0f]" />
                        {(item.product as unknown as {name:string})?.name} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <div>
                    <p className="text-xl font-black text-white">{formatBRL(b.price)}</p>
                    {itemTotal > b.price && <p className="text-xs text-[#b2ea0f]">Economia de {formatBRL(itemTotal - b.price)}</p>}
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-[#9ca3af]">Estoque</p>
                    <p className={`text-sm font-bold ${((b as BundleWithItems & { stock?: number }).stock ?? 999) <= 0 ? 'text-red-400' : 'text-white'}`}>
                      {(b as BundleWithItems & { stock?: number }).stock ?? 999}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t border-[#2a2a2a] mt-3">
                  <button onClick={() => openEdit(b)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#b2ea0f] transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => handleDelete(b.id, b.name)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-red-400 transition-colors ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>
            )
          })}
          {!bundles.length && (
            <div className="col-span-2 py-10 text-center text-[#9ca3af]">Nenhum kit cadastrado.</div>
          )}
        </div>
      )}
    </div>
  )
}
