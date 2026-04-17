'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatBRL, slugify } from '@/lib/utils'
import { Plus, Pencil, Trash2, X, Loader2, Package, Upload, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import ImageCropEditor from '@/components/admin/ImageCropEditor'
import type { Product, Category } from '@/types'

export default function AdminProductsPage() {
  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<Product | null>(null)
  const [saving, setSaving]             = useState(false)
  const [activeTab, setActiveTab]       = useState<string>('todos')
  const [form, setForm]                 = useState(defaultForm())
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [imagesList, setImagesList]   = useState<string[]>([])
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [cropSrc, setCropSrc]         = useState<string | null>(null)

  const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', '2XG']

  // Verifica se a categoria selecionada é Roupas
  const isRoupas = categories.find(c => c.id === form.category_id)?.slug === 'roupas'

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
    setImagesList([])
    setUploadError('')
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name, slug: p.slug, description: p.description || '',
      category_id: p.category_id || '', price: String(p.price),
      compare_price: p.compare_price ? String(p.compare_price) : '',
      stock: String(p.stock), images: '',
      active: p.active, featured: p.featured,
    })
    setSelectedSizes(p.sizes || [])
    setImagesList(p.images || [])
    setUploadError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()

    const images = imagesList
    const sizes  = isRoupas ? selectedSizes : []

    const data = {
      name:         form.name,
      slug:         form.slug || slugify(form.name),
      description:  form.description || null,
      category_id:  form.category_id || null,
      price:        parseFloat(form.price),
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      stock:        parseInt(form.stock) || 0,
      images, sizes,
      active:   form.active,
      featured: form.featured,
    }

    if (editing) {
      await supabase.from('products').update(data).eq('id', editing.id)
    } else {
      await supabase.from('products').insert(data)
    }

    toast.success(editing ? 'Produto atualizado.' : 'Produto criado.')
    setShowForm(false)
    load()
    setSaving(false)
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
    // Abre o editor para o primeiro arquivo selecionado
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
    // Remove do state imediatamente
    setImagesList(prev => prev.filter(u => u !== url))
    // Tenta deletar do Storage (extrai o caminho do arquivo da URL)
    try {
      const supabase = createClient()
      const parts = url.split('/product-images/')
      if (parts.length === 2) {
        await supabase.storage.from('product-images').remove([parts[1]])
      }
    } catch {
      // Falha silenciosa — imagem já foi removida da lista
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"? Esta acao nao pode ser desfeita.`)) return
    const supabase = createClient()

    // Buscar imagens do produto antes de deletar
    const { data: product } = await supabase
      .from('products')
      .select('images')
      .eq('id', id)
      .single()

    // Deletar imagens do Storage
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
      {/* Editor de recorte de imagem */}
      {cropSrc && (
        <ImageCropEditor
          imageSrc={cropSrc}
          onDone={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Produtos</h1>
          <p className="text-[#9ca3af] text-sm">{products.length} produto{products.length !== 1 ? 's' : ''} cadastrado{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-green gap-2">
          <Plus className="w-4 h-4" /> Novo Produto
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
          <div className="w-full max-w-2xl bg-[#111111] border border-[#2a2a2a] rounded-2xl my-4">
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
                <div>
                  <label className="label">Estoque (unidades)</label>
                  <input value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} type="number" min="0" className="input" placeholder="50" />
                </div>
                {/* Tamanhos: só para Roupas */}
                {isRoupas && (
                  <div className="md:col-span-2">
                    <label className="label">Tamanhos disponíveis</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {SIZES.map(size => {
                        const checked = selectedSizes.includes(size)
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setSelectedSizes(prev =>
                              checked ? prev.filter(s => s !== size) : [...prev, size]
                            )}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                              checked
                                ? 'bg-[#b2ea0f] border-[#b2ea0f] text-black'
                                : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#9ca3af] hover:border-[#b2ea0f]/50 hover:text-white'
                            }`}
                          >
                            {size}
                          </button>
                        )
                      })}
                    </div>
                    {selectedSizes.length === 0 && (
                      <p className="text-xs text-yellow-500 mt-1">Nenhum tamanho selecionado — o produto não terá opção de tamanho.</p>
                    )}
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="label">Descrição</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input min-h-[80px] resize-y" placeholder="Descreva o produto..." />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="label" style={{marginBottom:0}}>Imagens do Produto</label>
                    <span className={`text-xs font-semibold ${
                      imagesList.length >= 5 ? 'text-red-400' : 'text-[#9ca3af]'
                    }`}>{imagesList.length}/5</span>
                  </div>

                  {/* Thumbnails das imagens */}
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

                  {/* Área de upload — oculto quando limite atingido */}
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
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a] text-xs text-[#9ca3af] uppercase tracking-wider">
                  <th className="text-left px-5 py-3">Produto</th>
                  <th className="text-left px-5 py-3">Categoria</th>
                  <th className="text-right px-5 py-3">Preço</th>
                  <th className="text-center px-5 py-3">Estoque</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(p => activeTab === 'todos' || p.category_id === activeTab)
                  .map(p => (
                  <tr key={p.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center shrink-0 overflow-hidden">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-[#9ca3af]" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{p.name}</p>
                          {p.featured && <span className="text-xs text-[#b2ea0f]">★ Destaque</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#9ca3af]">
                      {(p.category as unknown as {name:string})?.name || '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="text-sm font-bold text-white">{formatBRL(p.price)}</p>
                      {p.compare_price && <p className="text-xs text-[#9ca3af] line-through">{formatBRL(p.compare_price)}</p>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-sm font-bold ${p.stock <= 5 ? 'text-yellow-400' : p.stock === 0 ? 'text-red-400' : 'text-white'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`badge ${p.active ? 'bg-[#b2ea0f]/20 text-[#b2ea0f]' : 'bg-[#2a2a2a] text-[#9ca3af]'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="w-8 h-8 rounded-lg bg-[#1a1a1a] text-[#9ca3af] hover:text-[#b2ea0f] hover:bg-[#b2ea0f]/10 flex items-center justify-center transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p.id, p.name)} className="w-8 h-8 rounded-lg bg-[#1a1a1a] text-[#9ca3af] hover:text-red-400 hover:bg-red-900/10 flex items-center justify-center transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
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
