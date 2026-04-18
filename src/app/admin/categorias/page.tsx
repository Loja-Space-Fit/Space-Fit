'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, slugify } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Loader2, Upload, ImageIcon, Package, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageCropEditor from '@/components/admin/ImageCropEditor'
import type { Category, Bundle, Product } from '@/types'

interface BundleItem {
  id: string
  product_id: string
  quantity: number
  product?: { name: string; price: number }
}

interface BundleWithItems extends Bundle {
  bundle_items?: BundleItem[]
}

type FormStep = null | 'type-select' | 'category' | 'bundle'

const defaultCatForm = () => ({ name: '', slug: '', description: '', image_url: '', active: true, display_order: 0, is_bundle_category: false })
const defaultBundleForm = () => ({ name: '', slug: '', description: '', price: '', active: true })

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [bundles, setBundles]       = useState<BundleWithItems[]>([])
  const [products, setProducts]     = useState<Product[]>([])
  const [loading, setLoading]       = useState(true)
  const [step, setStep]             = useState<FormStep>(null)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [editingBundle, setEditingBundle] = useState<BundleWithItems | null>(null)
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [cropSrc, setCropSrc]       = useState<string | null>(null)
  const [catForm, setCatForm]       = useState(defaultCatForm())
  const [bundleForm, setBundleForm] = useState(defaultBundleForm())
  const [bundleItems, setBundleItems] = useState<{ product_id: string; quantity: number }[]>([])
  const [bundleImagesList, setBundleImagesList] = useState<string[]>([])
  const [bundleUploading, setBundleUploading] = useState(false)
  const [cropContext, setCropContext] = useState<'category' | 'bundle'>('category')
  const [activeProductPicker, setActiveProductPicker] = useState<number | null>(null)
  const [pickerCatFilter, setPickerCatFilter] = useState<string>('todos')

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: cats }, { data: bunds }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('bundles').select('*, bundle_items(id, product_id, quantity, product:products(name, price))').order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, price, images, category_id').eq('active', true).order('name'),
    ])
    setCategories((cats || []) as Category[])
    setBundles((bunds || []) as unknown as BundleWithItems[])
    setProducts((prods || []) as unknown as Product[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function closeForm() {
    setStep(null)
    setEditingCat(null)
    setEditingBundle(null)
    if (cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null) }
  }

  // ── Category handlers ──────────────────────────────────────────────────────

  function openCreateCategory() {
    setEditingCat(null)
    setCatForm({ ...defaultCatForm(), display_order: categories.length + 1 })
    setStep('category')
  }

  function openEditCategory(c: Category) {
    setEditingCat(c)
    setCatForm({ name: c.name, slug: c.slug, description: c.description || '', image_url: c.image_url || '', active: c.active, display_order: c.display_order, is_bundle_category: c.is_bundle_category || false })
    setStep('category')
  }

  function openCreateBundle() {
    setEditingBundle(null)
    setBundleForm(defaultBundleForm())
    setBundleItems([{ product_id: '', quantity: 1 }])
    setBundleImagesList([])
    setStep('bundle')
  }

  function openEditBundle(b: BundleWithItems) {
    setEditingBundle(b)
    setBundleForm({ name: b.name, slug: b.slug, description: b.description || '', price: String(b.price), active: b.active })
    setBundleItems(b.bundle_items?.map(i => ({ product_id: i.product_id, quantity: i.quantity })) || [])
    setBundleImagesList(b.images || (b.image_url ? [b.image_url] : []))
    setStep('bundle')
  }

  function handleCatFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { toast.error('Use JPG, PNG ou WEBP.'); e.target.value = ''; return }
    if (file.size > 20 * 1024 * 1024) { toast.error('Imagem excede 20 MB.'); e.target.value = ''; return }
    setCropContext('category')
    setCropSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  function handleBundleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (bundleImagesList.length >= 3) { toast.error('Máximo de 3 imagens por kit.'); return }
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { toast.error('Use JPG, PNG ou WEBP.'); e.target.value = ''; return }
    if (file.size > 20 * 1024 * 1024) { toast.error('Imagem excede 20 MB.'); e.target.value = ''; return }
    setCropContext('bundle')
    setCropSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleCropDone(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    const supabase = createClient()
    if (cropContext === 'category') {
      setUploading(true)
      const fileName = `categorias/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      const { error } = await supabase.storage.from('product-images').upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })
      if (error) {
        toast.error(`Erro ao enviar imagem: ${error.message}`)
      } else {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
        setCatForm(f => ({ ...f, image_url: publicUrl }))
        toast.success('Imagem enviada!')
      }
      setUploading(false)
    } else {
      setBundleUploading(true)
      const fileName = `bundles/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      const { error } = await supabase.storage.from('product-images').upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })
      if (error) {
        toast.error(`Erro ao enviar imagem: ${error.message}`)
      } else {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
        setBundleImagesList(prev => [...prev, publicUrl])
        toast.success('Imagem enviada!')
      }
      setBundleUploading(false)
    }
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  async function handleRemoveImage() {
    const url = catForm.image_url
    setCatForm(f => ({ ...f, image_url: '' }))
    try {
      const supabase = createClient()
      const parts = url.split('/product-images/')
      if (parts.length === 2) await supabase.storage.from('product-images').remove([parts[1]])
    } catch { /* silencioso */ }
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const data = { ...catForm, slug: catForm.slug || slugify(catForm.name) }

    const conflict = categories.find(c => c.display_order === catForm.display_order && c.id !== editingCat?.id)
    if (conflict && editingCat) {
      await supabase.from('categories').update({ display_order: editingCat.display_order }).eq('id', conflict.id)
    }

    const { error } = editingCat
      ? await supabase.from('categories').update(data).eq('id', editingCat.id)
      : await supabase.from('categories').insert(data)

    if (error) {
      toast.error('Erro ao salvar categoria.')
    } else {
      toast.success(editingCat ? 'Categoria atualizada.' : 'Categoria criada.')
      closeForm()
      load()
    }
    setSaving(false)
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`Excluir a categoria "${name}"?`)) return
    const supabase = createClient()
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir categoria.')
    } else {
      setCategories(prev => prev.filter(c => c.id !== id))
      toast.success(`Categoria "${name}" excluída.`)
    }
  }

  async function handleSaveBundle(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const data = {
      name: bundleForm.name,
      slug: bundleForm.slug || slugify(bundleForm.name),
      description: bundleForm.description || null,
      price: parseFloat(bundleForm.price),
      image_url: bundleImagesList[0] || null,
      images: bundleImagesList,
      active: bundleForm.active,
    }

    let bundleId = editingBundle?.id
    if (editingBundle) {
      let { error: updateErr } = await supabase.from('bundles').update(data).eq('id', editingBundle.id)
      // Fallback: coluna images pode ainda não existir no banco
      if (updateErr?.message?.toLowerCase().includes('images')) {
        const { images: _imgs, ...dataWithout } = data
        const fallback = await supabase.from('bundles').update(dataWithout).eq('id', editingBundle.id)
        updateErr = fallback.error
      }
      if (updateErr) { toast.error(`Erro ao salvar kit: ${updateErr.message}`); setSaving(false); return }
      await supabase.from('bundle_items').delete().eq('bundle_id', editingBundle.id)
    } else {
      let { data: created, error: insertErr } = await supabase.from('bundles').insert(data).select('id').single()
      // Fallback: coluna images pode ainda não existir no banco
      if (insertErr?.message?.toLowerCase().includes('images')) {
        const { images: _imgs, ...dataWithout } = data
        const fallback = await supabase.from('bundles').insert(dataWithout).select('id').single()
        created = fallback.data
        insertErr = fallback.error
      }
      if (insertErr) { toast.error(`Erro ao criar kit: ${insertErr.message}`); setSaving(false); return }
      bundleId = created?.id
    }

    const validItems = bundleItems.filter(i => i.product_id)
    if (bundleId && validItems.length > 0) {
      const { error: itemsErr } = await supabase.from('bundle_items').insert(validItems.map(i => ({ bundle_id: bundleId, ...i })))
      if (itemsErr) toast.error(`Atenção: produtos do kit não foram salvos: ${itemsErr.message}`)
    }

    toast.success(editingBundle ? 'Kit atualizado.' : 'Kit criado.')
    closeForm()
    load()
    setSaving(false)
  }

  async function handleDeleteBundle(id: string, name: string) {
    if (!confirm(`Excluir o kit "${name}"?`)) return
    const supabase = createClient()
    await supabase.from('bundles').delete().eq('id', id)
    setBundles(prev => prev.filter(b => b.id !== id))
    toast.success(`Kit "${name}" excluído.`)
  }

  function addBundleItem() { setBundleItems(prev => [...prev, { product_id: '', quantity: 1 }]) }
  function removeBundleItem(i: number) { setBundleItems(prev => prev.filter((_, idx) => idx !== i)) }

  return (
    <div>
      {cropSrc && (
        <ImageCropEditor imageSrc={cropSrc} onDone={handleCropDone} onCancel={handleCropCancel} initialAspect={cropContext === 'bundle' ? 1 : 16 / 9} />
      )}

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Categorias</h1>
        <button onClick={() => setStep('type-select')} className="btn-green gap-2">
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      {/* ── Seletor de tipo ─────────────────────────────────────────────────── */}
      {step === 'type-select' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111111] border border-[#2a2a2a] rounded-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <h2 className="font-black text-white">Que tipo de categoria?</h2>
              <button onClick={closeForm}><X className="w-5 h-5 text-[#9ca3af]" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <button
                onClick={openCreateCategory}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-[#2a2a2a] hover:border-[#b2ea0f]/60 hover:bg-[#b2ea0f]/5 transition-all group"
              >
                <Tag className="w-8 h-8 text-[#9ca3af] group-hover:text-[#b2ea0f] transition-colors" />
                <div className="text-center">
                  <p className="font-bold text-white text-sm">Categoria</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">Agrupa produtos individuais</p>
                </div>
              </button>
              <button
                onClick={openCreateBundle}
                className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-[#2a2a2a] hover:border-[#b2ea0f]/60 hover:bg-[#b2ea0f]/5 transition-all group"
              >
                <Package className="w-8 h-8 text-[#9ca3af] group-hover:text-[#b2ea0f] transition-colors" />
                <div className="text-center">
                  <p className="font-bold text-white text-sm">Kit &amp; Combo</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">Vários produtos em conjunto</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Formulário de Categoria ──────────────────────────────────────────── */}
      {step === 'category' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
          <div className="w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <h2 className="font-black text-white">{editingCat ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button onClick={closeForm}><X className="w-5 h-5 text-[#9ca3af]" /></button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Nome *</label>
                <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} required className="input" placeholder="Ex: Roupas" />
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Slug (URL)</label>
                <input value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))} className="input" placeholder="roupas" />
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Descrição</label>
                <textarea value={catForm.description} onChange={e => setCatForm(f => ({ ...f, description: e.target.value }))} className="input" rows={2} placeholder="Descrição da categoria" />
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Imagem <span className="text-[#555] text-xs">(800×450px · proporção 16:9)</span></label>
                {catForm.image_url ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={catForm.image_url} alt="Imagem da categoria" className="w-full h-full object-cover" />
                    <button type="button" onClick={handleRemoveImage} className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors">
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
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCatFileChange} />
                  </label>
                )}
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Ordem de exibição</label>
                <select
                  value={catForm.display_order}
                  onChange={e => setCatForm(f => ({ ...f, display_order: parseInt(e.target.value) }))}
                  className="input"
                >
                  {Array.from({ length: editingCat ? categories.length : categories.length + 1 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>
                      {n}{categories.find(c => c.display_order === n && c.id !== editingCat?.id) ? ` — (atual: ${categories.find(c => c.display_order === n && c.id !== editingCat?.id)!.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={catForm.active} onChange={e => setCatForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-[#b2ea0f]" />
                <span className="text-sm text-white">Categoria ativa</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={closeForm} className="btn-outline">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-green flex-1">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : (editingCat ? 'Salvar' : 'Criar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Formulário de Kit/Combo ──────────────────────────────────────────── */}
      {step === 'bundle' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto overscroll-contain">
          <div className="w-full max-w-2xl bg-[#111111] border border-[#2a2a2a] rounded-2xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <h2 className="font-black text-white">{editingBundle ? 'Editar Kit' : 'Novo Kit & Combo'}</h2>
              <button onClick={closeForm}><X className="w-5 h-5 text-[#9ca3af]" /></button>
            </div>
            <form onSubmit={handleSaveBundle} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Nome do Kit *</label>
                  <input value={bundleForm.name} onChange={e => setBundleForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} required className="input" placeholder="Kit Iniciante" />
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af] mb-1 block">Preço do Kit (R$) *</label>
                  <input value={bundleForm.price} onChange={e => setBundleForm(f => ({ ...f, price: e.target.value }))} required type="number" step="0.01" min="0" className="input" placeholder="199.90" />
                </div>
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">Descrição</label>
                <textarea value={bundleForm.description} onChange={e => setBundleForm(f => ({ ...f, description: e.target.value }))} className="input" rows={2} placeholder="Descrição do kit" />
              </div>
              <div>
                <label className="text-sm text-[#9ca3af] mb-1 block">
                  Imagens do Kit <span className="text-[#555] text-xs">(800×800px · 1:1 · até 3 imagens)</span>
                </label>
                <div className="flex gap-2">
                  {bundleImagesList.map((url, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a] shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Imagem ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setBundleImagesList(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {bundleImagesList.length < 3 && (
                    <label className={`flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-xl border-2 border-dashed border-[#2a2a2a] cursor-pointer hover:border-[#b2ea0f]/50 transition-colors shrink-0 ${bundleUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {bundleUploading ? (
                        <Loader2 className="w-5 h-5 text-[#9ca3af] animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="w-5 h-5 text-[#555]" />
                          <span className="text-[10px] text-[#555]">Enviar</span>
                        </>
                      )}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleBundleFileChange} />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-[#9ca3af]">Produtos do Kit</label>
                  <button type="button" onClick={addBundleItem} className="text-xs text-[#b2ea0f] hover:text-[#c8f040]">+ Adicionar produto</button>
                </div>
                <div className="space-y-2">
                  {bundleItems.map((item, i) => {
                    const sel = products.find(p => p.id === item.product_id)
                    return (
                      <div key={i} className="flex gap-2 items-center">
                        {/* Quantidade (digitável) */}
                        <div className="flex flex-col items-center shrink-0">
                          <span className="text-[10px] text-[#9ca3af] mb-0.5">Qtd.</span>
                          <input
                            value={item.quantity}
                            onChange={e => setBundleItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: parseInt(e.target.value) || 1 } : it))}
                            type="number" min="1" className="input w-16 text-sm text-center"
                          />
                        </div>

                        {/* Seletor de produto com foto */}
                        <div className="flex-1 relative">
                          <span className="text-[10px] text-[#9ca3af] mb-0.5 block">Produto</span>
                          <button
                            type="button"
                            onClick={() => { setActiveProductPicker(activeProductPicker === i ? null : i); setPickerCatFilter('todos') }}
                            className="w-full flex items-center gap-2 px-3 h-10 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#b2ea0f]/40 transition-colors text-left"
                          >
                            {sel ? (
                              <>
                                {sel.images?.[0] ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={sel.images[0]} alt={sel.name} className="w-7 h-7 rounded object-cover shrink-0" />
                                ) : (
                                  <div className="w-7 h-7 rounded bg-[#2a2a2a] flex items-center justify-center shrink-0">
                                    <Package className="w-3.5 h-3.5 text-[#555]" />
                                  </div>
                                )}
                                <span className="text-sm text-white flex-1 truncate">{sel.name}</span>
                                <span className="text-xs text-[#9ca3af] shrink-0">{formatBRL(sel.price)}</span>
                              </>
                            ) : (
                              <span className="text-sm text-[#555]">Selecionar produto...</span>
                            )}
                          </button>

                          {/* Dropdown picker */}
                          {activeProductPicker === i && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setActiveProductPicker(null)} />
                              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 flex flex-col" style={{ maxHeight: '280px' }}>
                                {/* Abas de categoria */}
                                <div className="flex gap-1.5 p-2 border-b border-[#2a2a2a] overflow-x-auto shrink-0">
                                  {[{ id: 'todos', name: 'Todos' }, ...categories].map(cat => (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={e => { e.stopPropagation(); setPickerCatFilter(cat.id) }}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                        pickerCatFilter === cat.id
                                          ? 'bg-[#b2ea0f] text-black'
                                          : 'bg-[#2a2a2a] text-[#9ca3af] hover:text-white'
                                      }`}
                                    >
                                      {cat.name}
                                    </button>
                                  ))}
                                </div>
                                {/* Lista de produtos filtrada */}
                                <div className="overflow-y-auto overscroll-contain">
                                  {products
                                    .filter(p => pickerCatFilter === 'todos' || p.category_id === pickerCatFilter)
                                    .map(p => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => { setBundleItems(prev => prev.map((it, idx) => idx === i ? { ...it, product_id: p.id } : it)); setActiveProductPicker(null) }}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#2a2a2a] transition-colors text-left ${item.product_id === p.id ? 'bg-[#b2ea0f]/10' : ''}`}
                                      >
                                        {p.images?.[0] ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={p.images[0]} alt={p.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                                        ) : (
                                          <div className="w-9 h-9 rounded-lg bg-[#333] flex items-center justify-center shrink-0">
                                            <Package className="w-4 h-4 text-[#555]" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-white truncate">{p.name}</p>
                                          <p className="text-xs text-[#9ca3af]">{formatBRL(p.price)}</p>
                                        </div>
                                        {item.product_id === p.id && <span className="text-[#b2ea0f] text-xs shrink-0">✓</span>}
                                      </button>
                                    ))}
                                  {products.filter(p => pickerCatFilter === 'todos' || p.category_id === pickerCatFilter).length === 0 && (
                                    <p className="text-xs text-[#555] text-center py-4">Nenhum produto nesta categoria.</p>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="shrink-0 mt-4">
                          <button type="button" onClick={() => removeBundleItem(i)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a1a1a] text-red-400 hover:bg-red-900/20">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={bundleForm.active} onChange={e => setBundleForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-[#b2ea0f]" />
                <span className="text-sm text-white">Kit ativo (visível na loja)</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={closeForm} className="btn-outline">Cancelar</button>
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
        <div className="space-y-8">

          {/* ── Categorias ────────────────────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-bold text-[#9ca3af] uppercase tracking-widest mb-3">Categorias Individuais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white">{cat.name}</h3>
                      <p className="text-xs text-[#9ca3af] font-mono mt-0.5">/categoria/{cat.slug}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`badge ${cat.active ? 'bg-[#b2ea0f]/20 text-[#b2ea0f]' : 'bg-[#2a2a2a] text-[#9ca3af]'}`}>
                        {cat.active ? 'Ativa' : 'Inativa'}
                      </span>
                      {cat.is_bundle_category && (
                        <span className="badge bg-purple-500/20 text-purple-300 text-[10px]">Exibe Kits</span>
                      )}
                    </div>
                  </div>
                  {cat.description && <p className="text-sm text-[#9ca3af] mb-3">{cat.description}</p>}
                  <div className="flex gap-2 pt-3 border-t border-[#2a2a2a]">
                    <button onClick={() => openEditCategory(cat)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#b2ea0f] transition-colors">
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-red-400 transition-colors ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </div>
              ))}
              {!categories.length && (
                <div className="col-span-3 py-8 text-center text-[#9ca3af] text-sm">Nenhuma categoria cadastrada.</div>
              )}
            </div>
          </div>

          {/* ── Kits & Combos ─────────────────────────────────────────────── */}
          <div>
            <h2 className="text-sm font-bold text-[#9ca3af] uppercase tracking-widest mb-3">Kits &amp; Combos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bundles.map(b => {
                const itemTotal = b.bundle_items?.reduce((s, i) => s + ((i.product as unknown as { price: number })?.price || 0) * i.quantity, 0) || 0
                return (
                  <div key={b.id} className="relative bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 overflow-hidden">
                    {b.image_url && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.image_url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-20" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-[#111111]/60" />
                      </>
                    )}
                    <div className="relative">
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
                            {(item.product as unknown as { name: string })?.name} × {item.quantity}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mb-3">
                      <p className="text-xl font-black text-white">{formatBRL(b.price)}</p>
                      {itemTotal > b.price && <p className="text-xs text-[#b2ea0f]">Economia de {formatBRL(itemTotal - b.price)}</p>}
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-[#2a2a2a]">
                      <button onClick={() => openEditBundle(b)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-[#b2ea0f] transition-colors">
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button onClick={() => handleDeleteBundle(b.id, b.name)} className="flex items-center gap-1.5 text-xs text-[#9ca3af] hover:text-red-400 transition-colors ml-auto">
                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                      </button>
                    </div>
                    </div>
                  </div>
                )
              })}
              {!bundles.length && (
                <div className="col-span-2 py-8 text-center text-[#9ca3af] text-sm">Nenhum kit cadastrado.</div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
