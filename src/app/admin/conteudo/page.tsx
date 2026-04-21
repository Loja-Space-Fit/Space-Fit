'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pencil, Trash2, X, Loader2, Image as ImageIcon, Star, Upload } from 'lucide-react'
import ImageCropEditor from '@/components/admin/ImageCropEditor'
import type { Banner, Product, Category } from '@/types'

export default function AdminContentPage() {
  const [banners, setBanners]     = useState<Banner[]>([])
  const [products, setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState<Banner | null>(null)
  const [saving, setSaving]       = useState(false)
  const [savingFeatured, setSavingFeatured] = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [cropSrc, setCropSrc]       = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', subtitle: '', image_url: '', link: '', active: true, display_order: 1 })

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: b }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('banners').select('*').order('display_order'),
      supabase.from('products').select('id, name, featured, images').eq('active', true).order('name'),
      supabase.from('categories').select('name, slug').eq('active', true).order('display_order'),
    ])
    setBanners((b || []) as Banner[])
    setProducts((p || []) as unknown as Product[])
    setCategories((c || []) as Category[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ title: '', subtitle: '', image_url: '', link: '', active: true, display_order: banners.length + 1 })
    setShowForm(true)
  }

  function openEdit(b: Banner) {
    setEditing(b)
    setForm({ title: b.title, subtitle: b.subtitle || '', image_url: b.image_url, link: b.link || '', active: b.active, display_order: b.display_order })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    if (editing) {
      await supabase.from('banners').update(form).eq('id', editing.id)
    } else {
      await supabase.from('banners').insert(form)
    }
    setShowForm(false)
    load()
    setSaving(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { alert('Use JPG, PNG ou WEBP.'); e.target.value = ''; return }
    if (file.size > 20 * 1024 * 1024) { alert('Imagem excede 20 MB.'); e.target.value = ''; return }
    setCropSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleCropDone(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setUploading(true)
    const supabase = createClient()
    const fileName = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
      setForm(f => ({ ...f, image_url: publicUrl }))
    }
    setUploading(false)
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  async function handleRemoveImage() {
    const url = form.image_url
    setForm(f => ({ ...f, image_url: '' }))
    try {
      const supabase = createClient()
      const parts = url.split('/product-images/')
      if (parts.length === 2) await supabase.storage.from('product-images').remove([parts[1]])
    } catch { /* silencioso */ }
  }

  async function handleDeleteBanner(id: string, title: string) {
    if (!confirm(`Excluir o banner "${title}"?`)) return
    const supabase = createClient()
    await supabase.from('banners').delete().eq('id', id)
    setBanners(prev => prev.filter(b => b.id !== id))
  }

  async function toggleFeatured(product: Product) {
    setSavingFeatured(true)
    const supabase = createClient()
    await supabase.from('products').update({ featured: !product.featured }).eq('id', product.id)
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, featured: !p.featured } : p))
    setSavingFeatured(false)
  }

  return (
    <div className="space-y-10">
      {cropSrc && (
        <ImageCropEditor imageSrc={cropSrc} onDone={handleCropDone} onCancel={handleCropCancel} initialAspect={21 / 9} />
      )}
      {/* === BANNERS === */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Conteúdo do Site</h1>
            <p className="text-[#9ca3af] text-sm">Banners do carrossel e produtos em destaque</p>
          </div>
          <button onClick={openCreate} className="btn-green gap-2">
            <Plus className="w-4 h-4" /> Novo Banner
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-[#111111] border border-[#2a2a2a] rounded-2xl my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
                <h2 className="font-black text-white">{editing ? 'Editar Banner' : 'Novo Banner'}</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-[#9ca3af]" /></button>
              </div>
              <form onSubmit={handleSave} className="p-5 space-y-4">
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Título *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required className="input" placeholder="Ex: Coleção Verão 2025" />
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Subtítulo</label>
                  <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="input" placeholder="Ex: Roupas para arrasar na academia" />
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Imagem do banner <span className="text-[#555] text-xs">(1920×820px · proporção 21:9)</span></label>
                  {form.image_url ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a]">
                      <img src={form.image_url} alt="Banner" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center gap-2 w-full h-28 rounded-xl border-2 border-dashed border-[#2a2a2a] cursor-pointer hover:border-[#b2ea0f]/50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {uploading ? (
                        <Loader2 className="w-5 h-5 text-[#9ca3af] animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-[#555]" />
                          <span className="text-xs text-[#555] flex items-center gap-1"><Upload className="w-3 h-3" /> Enviar imagem</span>
                        </>
                      )}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
                    </label>
                  )}
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Ao clicar no banner</label>
                  <select
                    value={form.link}
                    onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                    className="input"
                  >
                    <option value="">Não fazer nada</option>
                    {categories.map(cat => (
                      <option key={cat.slug} value={`/categoria/${cat.slug}`}>
                        Ir para: {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-[#9ca3af] mb-1 block">Ordem</label>
                    <input value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 1 }))} type="number" min="1" className="input" />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-[#b2ea0f]" />
                      <span className="text-sm text-white">Banner ativo</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-green flex-1">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : (editing ? 'Salvar' : 'Criar Banner')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-[#9ca3af]">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map(b => (
              <div key={b.id} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="relative h-36 bg-[#1a1a1a]">
                  {b.image_url ? (
                    <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-[#2a2a2a]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-3">
                    <p className="font-bold text-white text-sm">{b.title}</p>
                    {b.subtitle && <p className="text-xs text-gray-300">{b.subtitle}</p>}
                  </div>
                  <span className={`absolute top-2 right-2 badge ${b.active ? 'bg-[#b2ea0f]/90 text-white' : 'bg-[#2a2a2a] text-[#9ca3af]'}`}>
                    {b.active ? 'Ativo' : 'Inativo'} · #{b.display_order}
                  </span>
                </div>
                <div className="flex gap-2 p-3">
                  <button onClick={() => openEdit(b)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#b2ea0f] transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => handleDeleteBanner(b.id, b.title)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-red-400 transition-colors ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </button>
                </div>
              </div>
            ))}
            {!banners.length && (
              <div className="col-span-2 py-10 text-center text-[#9ca3af]">Nenhum banner. Clique em "Novo Banner".</div>
            )}
          </div>
        )}
      </section>

      {/* === PRODUTOS EM DESTAQUE === */}
      <section>
        <h2 className="text-xl font-black text-white mb-2">Produtos em Destaque</h2>
        <p className="text-[#9ca3af] text-sm mb-5">Marke os produtos que aparecerão na seção destaque da página inicial.</p>
        {savingFeatured && <p className="text-[#b2ea0f] text-xs mb-2">Salvando...</p>}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-xs text-[#9ca3af] uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Produto</th>
                  <th className="text-center px-5 py-3">Destaque</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#2a2a2a] overflow-hidden flex-shrink-0">
                          {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />}
                        </div>
                        <span className="text-sm text-white">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => toggleFeatured(p)} className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all ${p.featured ? 'bg-[#b2ea0f] text-black' : 'bg-[#2a2a2a] text-[#9ca3af] hover:bg-[#b2ea0f]/20 hover:text-[#b2ea0f]'}`}>
                        <Star className="w-4 h-4" fill={p.featured ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
