'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, slugify } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Loader2, Package, Upload, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageCropEditor from '@/components/admin/ImageCropEditor'
import type { Product, Category } from '@/types'

// Sabor com estoque (usado apenas no formulário)
interface FlavorEntry {
  name: string
  stock: string
}

export default function AdminProductsPage() {
  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<Product | null>(null)
  const [saving, setSaving]             = useState(false)
  const [activeTab, setActiveTab]       = useState<string>('todos')
  const [form, setForm]                 = useState(defaultForm())

  // Tamanhos
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [hasSizesToggle, setHasSizesToggle] = useState(false)
  const [sizeStockForm, setSizeStockForm] = useState<Record<string, string>>({ P: '', M: '', G: '', GG: '' })

  // Sabores
  const [hasFlavorsToggle, setHasFlavorsToggle] = useState(false)
  const [flavorList, setFlavorList] = useState<FlavorEntry[]>([])
  // Para produtos com tamanho E sabor: variationStockForm[flavor][size] = estoque
  const [variationStockForm, setVariationStockForm] = useState<Record<string, Record<string, string>>>({})

  // Imagens
  const [imagesList, setImagesList]   = useState<string[]>([])
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [cropSrc, setCropSrc]         = useState<string | null>(null)

  const SIZES = ['P', 'M', 'G', 'GG']

  const isCombo = hasSizesToggle && hasFlavorsToggle

  function defaultForm() {
    return {
      name: '', slug: '', description: '', category_id: '',
      price: '', compare_price: '', stock: '', images: '',
      active: true, featured: false,
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('products').select('*, category:categories(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').eq('active', true).order('display_order'),
    ])
    setProducts((p || []) as unknown as Product[])
    setCategories((c || []) as Category[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(defaultForm())
    setSelectedSizes([])
    setHasSizesToggle(false)
    setSizeStockForm({ P: '', M: '', G: '', GG: '' })
    setHasFlavorsToggle(false)
    setFlavorList([])
    setVariationStockForm({})
    setImagesList([])
    setUploadError('')
    setShowForm(true)
  }

  async function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name, slug: p.slug, description: p.description || '',
      category_id: p.category_id || '', price: String(p.price),
      compare_price: p.compare_price ? String(p.compare_price) : '',
      stock: String(p.stock), images: '',
      active: p.active, featured: p.featured,
    })

    const hasSizes   = (p.sizes?.length ?? 0) > 0
    const hasFlavors = (p.flavors?.length ?? 0) > 0

    setHasSizesToggle(hasSizes)
    setSelectedSizes(p.sizes || [])
    setSizeStockForm({
      P:  String(p.size_stock?.P  ?? ''),
      M:  String(p.size_stock?.M  ?? ''),
      G:  String(p.size_stock?.G  ?? ''),
      GG: String(p.size_stock?.GG ?? ''),
    })

    setHasFlavorsToggle(hasFlavors)

    if (hasFlavors && hasSizes) {
      // Produto combo: carrega variações da tabela
      const supabase = createClient()
      const { data: variations } = await supabase
        .from('product_variations')
        .select('size, flavor, stock')
        .eq('product_id', p.id)

      setFlavorList((p.flavors || []).map(f => ({ name: f, stock: '' })))

      const vsf: Record<string, Record<string, string>> = {}
      for (const v of variations ?? []) {
        if (!vsf[v.flavor]) vsf[v.flavor] = {}
        vsf[v.flavor][v.size] = String(v.stock)
      }
      setVariationStockForm(vsf)
    } else if (hasFlavors) {
      // Produto com sabor apenas
      setFlavorList((p.flavors || []).map(f => ({
        name: f,
        stock: String(p.flavor_stock?.[f] ?? ''),
      })))
      setVariationStockForm({})
    } else {
      setFlavorList([])
      setVariationStockForm({})
    }

    setImagesList(p.images || [])
    setUploadError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()

    const images = imagesList
    const sizes  = hasSizesToggle ? selectedSizes : []
    const flavors = hasFlavorsToggle ? flavorList.map(f => f.name).filter(n => n.trim() !== '') : []

    let size_stock: Record<string, number> = {}
    let flavor_stock: Record<string, number> = {}
    let stock = 0

    if (isCombo) {
      // Combo: estoque por variação — size_stock e flavor_stock ficam vazios
      size_stock = {}
      flavor_stock = {}
      for (const flavor of flavors) {
        for (const size of selectedSizes) {
          stock += parseInt(variationStockForm[flavor]?.[size] || '0') || 0
        }
      }
    } else if (hasSizesToggle) {
      // Somente tamanho
      for (const s of selectedSizes) {
        size_stock[s] = parseInt(sizeStockForm[s] || '0') || 0
      }
      stock = Object.values(size_stock).reduce((a, b) => a + b, 0)
    } else if (hasFlavorsToggle) {
      // Somente sabor
      for (const f of flavorList) {
        if (f.name.trim()) {
          flavor_stock[f.name] = parseInt(f.stock || '0') || 0
        }
      }
      stock = Object.values(flavor_stock).reduce((a, b) => a + b, 0)
    } else {
      // Produto simples
      stock = parseInt(form.stock) || 0
    }

    const data = {
      name:         form.name,
      slug:         form.slug || slugify(form.name),
      description:  form.description || null,
      category_id:  form.category_id || null,
      price:        parseFloat(form.price),
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      stock, images, sizes, size_stock, flavors, flavor_stock,
      active:   form.active,
      featured: form.featured,
    }

    let productId: string | null = null

    if (editing) {
      await supabase.from('products').update(data).eq('id', editing.id)
      productId = editing.id
    } else {
      const { data: newProd } = await supabase.from('products').insert(data).select('id').single()
      productId = newProd?.id ?? null
    }

    // Salvar variações (combo)
    if (productId && isCombo) {
      await supabase.from('product_variations').delete().eq('product_id', productId)
      const rows = []
      for (const flavor of flavors) {
        for (const size of selectedSizes) {
          rows.push({
            product_id: productId,
            size,
            flavor,
            stock: parseInt(variationStockForm[flavor]?.[size] || '0') || 0,
          })
        }
      }
      if (rows.length > 0) {
        await supabase.from('product_variations').insert(rows)
      }
    } else if (productId && editing && !isCombo) {
      // Se produto deixou de ser combo, limpar variações antigas
      await supabase.from('product_variations').delete().eq('product_id', productId)
    }

    toast.success(editing ? 'Produto atualizado.' : 'Produto criado.')
    setShowForm(false)
    load()
    setSaving(false)
  }

  // Sincroniza variationStockForm quando tamanhos ou sabores mudam no combo
  function syncVariationForm(flavors: FlavorEntry[], sizes: string[]) {
    setVariationStockForm(prev => {
      const next: Record<string, Record<string, string>> = {}
      for (const f of flavors) {
        if (!f.name.trim()) continue
        next[f.name] = {}
        for (const s of sizes) {
          next[f.name][s] = prev[f.name]?.[s] ?? ''
        }
      }
      return next
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadError('')
    const slots = 5 - imagesList.length
    if (slots <= 0) {
      setUploadError('Limite de 5 imagens atingido. Remova uma para adicionar outra.')
      e.target.value = ''
      return
    }
    const file = files[0]
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) {
      setUploadError(`"${file.name}" não é uma imagem válida (use JPG, PNG ou WEBP).`)
      e.target.value = ''
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError(`"${file.name}" excede 20 MB.`)
      e.target.value = ''
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setCropSrc(objectUrl)
    e.target.value = ''
  }

  async function handleCropDone(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setUploading(true)
    const supabase = createClient()
    const ext = 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) {
      toast.error(`Erro ao enviar imagem: ${error.message}`)
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)
      setImagesList(prev => [...prev, publicUrl])
    }
    setUploading(false)
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  async function handleRemoveImage(url: string) {
    setImagesList(prev => prev.filter(u => u !== url))
    try {
      const supabase = createClient()
      const parts = url.split('/product-images/')
      if (parts.length === 2) {
        await supabase.storage.from('product-images').remove([parts[1]])
      }
    } catch { /* Falha silenciosa */ }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"? Esta acao nao pode ser desfeita.`)) return
    const supabase = createClient()

    const { data: product } = await supabase
      .from('products')
      .select('images')
      .eq('id', id)
      .single()

    if (product?.images?.length) {
      const paths = product.images.map((url: string) => {
        const match = url.match(/product-images\/(.+)$/)
        return match ? match[1] : null
      }).filter(Boolean) as string[]

      if (paths.length) {
        await supabase.storage.from('product-images').remove(paths)
      }
    }

    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir produto.')
    } else {
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success(`"${name}" excluido.`)
    }
  }

  return (
    <div>
      {cropSrc && (
        <ImageCropEditor
          imageSrc={cropSrc}
          onDone={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Produtos</h1>
          <p className="text-[#9ca3af] text-sm">{products.length} produto{products.length !== 1 ? 's' : ''} cadastrado{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-green !px-3 !py-2 md:!px-5 md:!py-3 flex items-center gap-1.5 shrink-0">
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Novo Produto</span>
        </button>
      </div>

      {/* Abas por categoria */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[{ id: 'todos', name: 'Todos' }, ...categories].map(cat => {
          const count = cat.id === 'todos'
            ? products.length
            : products.filter(p => p.category_id === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                activeTab === cat.id
                  ? 'bg-[#b2ea0f] border-[#b2ea0f] text-black'
                  : 'bg-[#111111] border-[#2a2a2a] text-[#9ca3af] hover:border-[#b2ea0f]/50 hover:text-white'
              }`}
            >
              {cat.name} <span className="opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Modal do formulário */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto overscroll-contain">
          <div className="w-full max-w-2xl card-dark my-4">
            <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
              <h2 className="font-black text-white">{editing ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#9ca3af] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Nome do Produto *</label>
                  <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) })) }} required className="input" placeholder="Ex: Whey Protein 900g" />
                </div>
                <div>
                  <label className="label">URL amigável (slug)</label>
                  <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} className="input" placeholder="whey-protein-900g" />
                </div>
                <div>
                  <label className="label">Categoria</label>
                  <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="input">
                    <option value="">Sem categoria</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Preço (R$) *</label>
                  <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required type="number" step="0.01" min="0" className="input" placeholder="89.90" />
                </div>
                <div>
                  <label className="label">Preço original (riscado, opcional)</label>
                  <input value={form.compare_price} onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} type="number" step="0.01" min="0" className="input" placeholder="119.90" />
                </div>

                {/* ── Toggle: Possui tamanhos? ── */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hasSizesToggle}
                      onClick={() => {
                        const next = !hasSizesToggle
                        setHasSizesToggle(next)
                        if (!next) {
                          setSelectedSizes([])
                          setSizeStockForm({ P: '', M: '', G: '', GG: '' })
                        }
                        // Sincroniza grade de variações
                        if (hasFlavorsToggle) {
                          syncVariationForm(flavorList, next ? selectedSizes : [])
                        }
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
                        hasSizesToggle ? 'bg-[#b2ea0f]' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        hasSizesToggle ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                    <span className="text-sm text-white font-medium">Possui tamanhos?</span>
                  </label>
                </div>

                {/* ── Toggle: Possui sabores? ── */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hasFlavorsToggle}
                      onClick={() => {
                        const next = !hasFlavorsToggle
                        setHasFlavorsToggle(next)
                        if (!next) {
                          setFlavorList([])
                          setVariationStockForm({})
                        } else if (hasSizesToggle) {
                          syncVariationForm(flavorList, selectedSizes)
                        }
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${
                        hasFlavorsToggle ? 'bg-[#b2ea0f]' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        hasFlavorsToggle ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                    <span className="text-sm text-white font-medium">Possui sabores?</span>
                  </label>
                </div>

                {/* ── Estoque único — só quando NÃO tem tamanhos nem sabores ── */}
                {!hasSizesToggle && !hasFlavorsToggle && (
                  <div>
                    <label className="label">Estoque (unidades)</label>
                    <input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} type="number" min="0" className="input" placeholder="50" />
                  </div>
                )}

                {/* ── Tamanhos — quando tem tamanho mas NÃO é combo ── */}
                {hasSizesToggle && !hasFlavorsToggle && (
                  <div className="md:col-span-2">
                    <label className="label">Tamanhos e estoques</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {SIZES.map(size => {
                        const checked = selectedSizes.includes(size)
                        return (
                          <div
                            key={size}
                            className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                              checked ? 'border-[#b2ea0f]/40 bg-[#b2ea0f]/5' : 'border-[#2a2a2a] bg-[#1a1a1a] opacity-60'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const willCheck = !checked
                                setSelectedSizes(prev =>
                                  willCheck ? [...prev, size] : prev.filter(s => s !== size)
                                )
                                if (!willCheck) setSizeStockForm(prev => ({ ...prev, [size]: '' }))
                              }}
                              className={`w-12 h-9 rounded-lg text-sm font-bold border-2 transition-all shrink-0 ${
                                checked
                                  ? 'border-[#b2ea0f] bg-[#b2ea0f] text-black'
                                  : 'border-[#2a2a2a] text-[#9ca3af] hover:border-[#b2ea0f]/50'
                              }`}
                            >
                              {size}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-[#9ca3af] mb-0.5">Estoque</p>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                disabled={!checked}
                                value={sizeStockForm[size] ?? ''}
                                onChange={e => setSizeStockForm(prev => ({ ...prev, [size]: e.target.value }))}
                                className="input !py-1 !text-sm w-full disabled:opacity-30 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {selectedSizes.length === 0 && (
                      <p className="text-xs text-yellow-500 mt-1.5">Nenhum tamanho selecionado · o produto não terá seletor de tamanho na loja.</p>
                    )}
                  </div>
                )}

                {/* ── Tamanhos para combo (sem estoques inline — ficam na grade) ── */}
                {isCombo && (
                  <div className="md:col-span-2">
                    <label className="label">Tamanhos disponíveis</label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {SIZES.map(size => {
                        const checked = selectedSizes.includes(size)
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              const next = checked
                                ? selectedSizes.filter(s => s !== size)
                                : [...selectedSizes, size]
                              setSelectedSizes(next)
                              syncVariationForm(flavorList, next)
                            }}
                            className={`w-14 h-10 rounded-lg text-sm font-bold border-2 transition-all ${
                              checked
                                ? 'border-[#b2ea0f] bg-[#b2ea0f] text-black'
                                : 'border-[#2a2a2a] text-[#9ca3af] hover:border-[#b2ea0f]/50'
                            }`}
                          >
                            {size}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── Sabores (lista gerenciável) ── */}
                {hasFlavorsToggle && (
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="label" style={{ marginBottom: 0 }}>
                        Sabores{isCombo ? '' : ' e estoques'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...flavorList, { name: '', stock: '0' }]
                          setFlavorList(next)
                          if (isCombo) syncVariationForm(next, selectedSizes)
                        }}
                        className="flex items-center gap-1 text-xs text-[#b2ea0f] hover:text-white border border-[#b2ea0f]/40 hover:border-[#b2ea0f] rounded-lg px-2 py-1 transition-all"
                      >
                        <Plus className="w-3 h-3" /> Adicionar sabor
                      </button>
                    </div>

                    <div className="space-y-2 mt-1">
                      {flavorList.map((flavor, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border border-[#b2ea0f]/20 bg-[#b2ea0f]/5">
                          <div className="flex-1">
                            <input
                              type="text"
                              placeholder="Nome do sabor (ex: Chocolate)"
                              value={flavor.name}
                              onChange={e => {
                                const oldName = flavorList[idx].name
                                const newName = e.target.value
                                const next = flavorList.map((f, i) =>
                                  i === idx ? { ...f, name: newName } : f
                                )
                                setFlavorList(next)
                                // Renomeia chave no variationStockForm
                                if (isCombo && oldName !== newName) {
                                  setVariationStockForm(prev => {
                                    const updated: Record<string, Record<string, string>> = {}
                                    for (const [k, v] of Object.entries(prev)) {
                                      updated[k === oldName ? newName : k] = v
                                    }
                                    return updated
                                  })
                                }
                              }}
                              className="input !py-1 !text-sm w-full"
                            />
                          </div>
                          {/* Estoque só aparece aqui para produtos com sabor apenas (não combo) */}
                          {!isCombo && (
                            <div className="w-24">
                              <p className="text-[10px] text-[#9ca3af] mb-0.5">Estoque</p>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={flavor.stock}
                                onChange={e => setFlavorList(prev =>
                                  prev.map((f, i) => i === idx ? { ...f, stock: e.target.value } : f)
                                )}
                                className="input !py-1 !text-sm w-full"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const removedName = flavorList[idx].name
                              const next = flavorList.filter((_, i) => i !== idx)
                              setFlavorList(next)
                              if (isCombo && removedName) {
                                setVariationStockForm(prev => {
                                  const updated = { ...prev }
                                  delete updated[removedName]
                                  return updated
                                })
                              }
                            }}
                            className="text-[#9ca3af] hover:text-red-400 transition-colors shrink-0 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {flavorList.length === 0 && (
                        <p className="text-xs text-yellow-500">
                          Nenhum sabor adicionado · clique em &quot;Adicionar sabor&quot; para começar.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Grade de variações (combo: sabor × tamanho) ── */}
                {isCombo && selectedSizes.length > 0 && flavorList.some(f => f.name.trim()) && (
                  <div className="md:col-span-2">
                    <label className="label flex items-center gap-1.5">
                      <ChevronDown className="w-3.5 h-3.5" />
                      Estoque por variação (sabor × tamanho)
                    </label>
                    <div className="overflow-x-auto mt-1 rounded-lg border border-[#2a2a2a] bg-[#1a1a1a]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#2a2a2a]">
                            <th className="text-left text-[#9ca3af] py-2 px-3 font-medium">Sabor</th>
                            {selectedSizes.map(size => (
                              <th key={size} className="text-center text-[#b2ea0f] py-2 px-2 font-bold min-w-[4.5rem]">{size}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {flavorList.filter(f => f.name.trim()).map((flavor, idx) => (
                            <tr key={flavor.name || idx} className="border-b border-[#2a2a2a] last:border-0">
                              <td className="text-white py-2 px-3 font-medium whitespace-nowrap">{flavor.name}</td>
                              {selectedSizes.map(size => (
                                <td key={size} className="px-1.5 py-1.5">
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={variationStockForm[flavor.name]?.[size] ?? ''}
                                    onChange={e => setVariationStockForm(prev => ({
                                      ...prev,
                                      [flavor.name]: {
                                        ...(prev[flavor.name] ?? {}),
                                        [size]: e.target.value,
                                      },
                                    }))}
                                    className="input !py-1 !text-sm w-full text-center"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Descrição */}
                <div className="md:col-span-2">
                  <label className="label">Descrição</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input min-h-[80px] resize-y" placeholder="Descreva o produto..." />
                </div>

                {/* Imagens */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="label" style={{marginBottom:0}}>Imagens do Produto</label>
                    <span className={`text-xs font-semibold ${
                      imagesList.length >= 5 ? 'text-red-400' : 'text-[#9ca3af]'
                    }`}>{imagesList.length}/5</span>
                  </div>

                  {imagesList.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {imagesList.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-[#2a2a2a] border border-[#3a3a3a] group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          {i === 0 && (
                            <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-[#b2ea0f] text-black font-bold py-0.5">PRINCIPAL</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {imagesList.length < 5 ? (
                  <label className={`flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    uploading
                      ? 'border-[#b2ea0f]/40 bg-[#b2ea0f]/5 cursor-not-allowed'
                      : 'border-[#2a2a2a] hover:border-[#b2ea0f]/50 hover:bg-[#b2ea0f]/5'
                  }`}>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" disabled={uploading} onChange={handleUpload} />
                    {uploading ? (
                      <><Loader2 className="w-5 h-5 text-[#b2ea0f] animate-spin" /><span className="text-sm text-[#9ca3af]">Enviando imagem...</span></>
                    ) : (
                      <><Upload className="w-5 h-5 text-[#9ca3af]" /><span className="text-sm text-[#9ca3af]">Clique para fazer upload <span className="text-[#b2ea0f]">ou arraste</span> as fotos</span><span className="text-xs text-[#6b7280]">JPG, PNG, WEBP — máx. 5 MB cada · até {5 - imagesList.length} foto(s) restante(s)</span></>
                    )}
                  </label>
                  ) : (
                    <div className="flex items-center justify-center w-full h-16 border-2 border-dashed border-red-900/40 rounded-xl bg-red-900/5">
                      <span className="text-sm text-red-400">Limite de 5 imagens atingido. Remova uma para adicionar outra.</span>
                    </div>
                  )}
                  {uploadError && (
                    <p className="text-xs text-red-400 mt-1">{uploadError}</p>
                  )}
                </div>

                <div className="md:col-span-2 flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 accent-[#b2ea0f]" />
                    <span className="text-sm text-white">Produto ativo (visível na loja)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="w-4 h-4 accent-[#b2ea0f]" />
                    <span className="text-sm text-white">Produto em destaque</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-green flex-1">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : (editing ? 'Salvar Alterações' : 'Criar Produto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabela de produtos */}
      {loading ? (
        <div className="text-center py-20 text-[#9ca3af]">Carregando...</div>
      ) : (
        <div className="card-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-xs text-[#9ca3af] uppercase tracking-wider">
                  <th className="text-left px-3 sm:px-5 py-3">Produto</th>
                  <th className="text-left px-5 py-3 hidden sm:table-cell">Categoria</th>
                  <th className="text-right px-5 py-3 hidden sm:table-cell">Preço</th>
                  <th className="text-center px-5 py-3 hidden sm:table-cell">Estoque</th>
                  <th className="text-center px-5 py-3 hidden sm:table-cell">Status</th>
                  <th className="text-right px-3 sm:px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(p => activeTab === 'todos' || p.category_id === activeTab)
                  .map(p => (
                  <tr key={p.id} onClick={() => openEdit(p)} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors cursor-pointer">
                    <td className="px-3 sm:px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center shrink-0 overflow-hidden">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-[#9ca3af]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-tight">{p.name}</p>
                          {p.featured && <span className="text-xs text-[#b2ea0f]">★ Destaque</span>}
                          <p className="text-xs text-[#9ca3af] sm:hidden">{(p.category as unknown as {name:string})?.name || '—'}</p>
                          <div className="sm:hidden mt-0.5">
                            <span className="text-sm font-bold text-white">{formatBRL(p.price)}</span>
                            {p.compare_price && <span className="text-xs text-[#9ca3af] line-through ml-1">{formatBRL(p.compare_price)}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#9ca3af] hidden sm:table-cell">
                      {(p.category as unknown as {name:string})?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-right hidden sm:table-cell">
                      <p className="text-sm font-bold text-white">{formatBRL(p.price)}</p>
                      {p.compare_price && <p className="text-xs text-[#9ca3af] line-through">{formatBRL(p.compare_price)}</p>}
                    </td>
                    <td className="px-5 py-3 text-center hidden sm:table-cell">
                      <StockCell product={p} />
                    </td>
                    <td className="px-5 py-3 text-center hidden sm:table-cell">
                      <span className={`badge ${p.active ? 'bg-[#b2ea0f]/20 text-[#b2ea0f]' : 'bg-[#2a2a2a] text-[#9ca3af]'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <button onClick={e => { e.stopPropagation(); openEdit(p) }} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#1a1a1a] text-[#9ca3af] hover:text-[#b2ea0f] hover:bg-[#b2ea0f]/10 flex items-center justify-center transition-all">
                          <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(p.id, p.name) }} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#1a1a1a] text-[#9ca3af] hover:text-red-400 hover:bg-red-900/10 flex items-center justify-center transition-all">
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!products.filter(p => activeTab === 'todos' || p.category_id === activeTab).length && (
                  <tr><td colSpan={6} className="py-12 text-center text-[#9ca3af]">
                    {activeTab === 'todos' ? 'Nenhum produto. Clique em "Novo Produto" para cadastrar.' : 'Nenhum produto nesta categoria.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx global>{`.label { display: block; color: #9ca3af; font-size: 0.8rem; margin-bottom: 0.25rem; }`}</style>
    </div>
  )
}

// Componente de célula de estoque na tabela
function StockCell({ product: p }: { product: Product }) {
  const hasSizes   = (p.sizes?.length ?? 0) > 0
  const hasFlavors = (p.flavors?.length ?? 0) > 0

  if (hasSizes && hasFlavors) {
    // Combo: mostra total
    return (
      <span className={`text-sm font-bold ${p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-yellow-400' : 'text-white'}`}>
        {p.stock} total
      </span>
    )
  }

  if (hasSizes && Object.keys(p.size_stock || {}).length > 0) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {p.sizes.map(s => (
          <span key={s} className={`text-xs font-semibold ${(p.size_stock[s] ?? 0) === 0 ? 'text-red-400' : (p.size_stock[s] ?? 0) <= 3 ? 'text-yellow-400' : 'text-white'}`}>
            {s}: {p.size_stock[s] ?? 0}
          </span>
        ))}
      </div>
    )
  }

  if (hasFlavors && Object.keys(p.flavor_stock || {}).length > 0) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {p.flavors.map(f => (
          <span key={f} className={`text-xs font-semibold ${(p.flavor_stock[f] ?? 0) === 0 ? 'text-red-400' : (p.flavor_stock[f] ?? 0) <= 3 ? 'text-yellow-400' : 'text-white'}`}>
            {f}: {p.flavor_stock[f] ?? 0}
          </span>
        ))}
      </div>
    )
  }

  return (
    <span className={`text-sm font-bold ${p.stock === 0 ? 'text-red-400' : p.stock <= 5 ? 'text-yellow-400' : 'text-white'}`}>
      {p.stock}
    </span>
  )
}
