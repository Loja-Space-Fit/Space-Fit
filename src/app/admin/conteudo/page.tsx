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
  const [form, setForm] = useState({ title: '', subtitle: '', image_url: '', link: '', active: true, display_order: 1, highlighted_words: [] as number[], highlight_color: '#b2ea0f', button_text: 'Comprar Agora' })

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
    setForm({ title: '', subtitle: '', image_url: '', link: '', active: true, display_order: banners.length + 1, highlighted_words: [], highlight_color: '#b2ea0f', button_text: 'Comprar Agora' })
    setShowForm(true)
  }

  function openEdit(b: Banner) {
    setEditing(b)
    setForm({ title: b.title, subtitle: b.subtitle || '', image_url: b.image_url, link: b.link || '', active: b.active, display_order: b.display_order, highlighted_words: b.highlighted_words || [], highlight_color: b.highlight_color || '#b2ea0f', button_text: b.button_text || 'Comprar Agora' })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    if (editing) {
      const newOrder = form.display_order
      const oldOrder = editing.display_order
      if (newOrder !== oldOrder) {
        // Swap: banner que estava na posição alvo assume a posição anterior
        const displaced = banners.find(b => b.display_order === newOrder && b.id !== editing.id)
        if (displaced) {
          await supabase.from('banners').update({ display_order: oldOrder }).eq('id', displaced.id)
        }
      }
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
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">Conteúdo do Site</h1>
            <p className="text-[#9ca3af] text-sm">Banners do carrossel e produtos em destaque</p>
          </div>
          <button onClick={openCreate} className="btn-green !px-3 !py-2 md:!px-5 md:!py-3 flex items-center gap-1.5 shrink-0">
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Novo Banner</span>
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-4xl bg-[#111111] border border-[#2a2a2a] rounded-2xl my-auto">
              <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
                <h2 className="font-black text-white">{editing ? 'Editar Banner' : 'Novo Banner'}</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-[#9ca3af]" /></button>
              </div>
              <div className="flex flex-col lg:flex-row">
                {/* Coluna esquerda: formulário */}
                <form onSubmit={handleSave} className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[80vh]">
                  <div>
                    <label className="text-sm text-[#9ca3af] mb-1 block">Título *</label>
                    <input
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value, highlighted_words: [] }))}
                      required
                      className="input"
                      placeholder="Ex: Coleção Verão 2025"
                    />
                    {/* Word chips */}
                    {form.title.trim() && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {form.title.trim().split(/\s+/).map((word, i) => {
                          const active = form.highlighted_words.includes(i)
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setForm(f => ({
                                ...f,
                                highlighted_words: f.highlighted_words.includes(i)
                                  ? f.highlighted_words.filter(n => n !== i)
                                  : [...f.highlighted_words, i]
                              }))}
                              style={active ? {
                                backgroundColor: `${form.highlight_color}22`,
                                borderColor: form.highlight_color,
                                color: form.highlight_color,
                              } : {}}
                              className={`px-2 py-0.5 rounded text-xs font-bold border transition-all ${active ? '' : 'border-[#2a2a2a] text-[#9ca3af] bg-[#1a1a1a]'}`}
                            >
                              {word}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {form.title.trim() && (
                      <p className="text-[#555] text-xs mt-1">Clique nas palavras para destacar</p>
                    )}
                  </div>

                  {/* Color selector */}
                  {form.title.trim() && (
                    <div>
                      <label className="text-sm text-[#9ca3af] mb-2 block">Cor do destaque</label>
                      <div className="flex items-center gap-3">
                        {([['#b2ea0f', 'Verde'], ['#ffffff', 'Branco']] as const).map(([color, label]) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, highlight_color: color }))}
                            className={`flex flex-col items-center gap-1 group`}
                          >
                            <span
                              className={`w-7 h-7 rounded-full block border-2 transition-all ${form.highlight_color === color ? 'outline outline-2 outline-offset-2 outline-[#b2ea0f]' : 'border-[#2a2a2a]'}`}
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-xs text-[#9ca3af]">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-[#9ca3af] mb-1 block">Subtítulo</label>
                    <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="input" placeholder="Ex: Roupas para arrasar na academia" />
                  </div>

                  <div>
                    <label className="text-sm text-[#9ca3af] mb-1 block">Texto do botão</label>
                    <input
                      value={form.button_text}
                      onChange={e => setForm(f => ({ ...f, button_text: e.target.value }))}
                      className="input"
                      placeholder="Comprar Agora"
                    />
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
                      <select
                        value={form.display_order}
                        onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) }))}
                        className="input"
                      >
                        {Array.from(
                          { length: editing ? banners.length : banners.length + 1 },
                          (_, i) => i + 1
                        ).map(n => {
                          const ocupado = banners.find(b => b.display_order === n && b.id !== editing?.id)
                          const isAtual = editing && n === editing.display_order
                          return (
                            <option key={n} value={n}>
                              {`Posição ${n}`}{isAtual ? ' (atual)' : ocupado ? ` ⇄ ${ocupado.title}` : ''}
                            </option>
                          )
                        })}
                      </select>
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

                {/* Coluna direita: preview */}
                <div className="lg:w-72 shrink-0 p-5 border-t lg:border-t-0 lg:border-l border-[#2a2a2a]">
                  <p className="text-sm text-[#9ca3af] mb-3 font-semibold">Prévia</p>
                  <div className="aspect-[21/9] relative overflow-hidden rounded-xl bg-[#1a1a1a]">
                    {form.image_url && (
                      <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    {!form.image_url && (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#111] to-[#0a0a0a]" />
                    )}
                    {/* Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60" />
                    {/* Accent line */}
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#b2ea0f]" />
                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-center px-3 py-2">
                      {/* Badge */}
                      <div className="inline-flex items-center gap-1 bg-[#b2ea0f]/15 border border-[#b2ea0f]/40 rounded-full px-1.5 py-0.5 mb-1.5 w-fit">
                        <span className="w-1 h-1 rounded-full bg-[#b2ea0f]" />
                        <span className="text-[#b2ea0f] text-[9px] font-bold uppercase tracking-wider">Space Fit</span>
                      </div>
                      {form.title ? (
                        <h3 className="text-white font-black text-[10px] uppercase leading-tight mb-1">
                          {form.title.trim().split(/\s+/).map((word, i) => (
                            <span key={i}>
                              {form.highlighted_words.includes(i)
                                ? <span style={{ color: form.highlight_color }}>{word}</span>
                                : word}
                              {' '}
                            </span>
                          ))}
                        </h3>
                      ) : (
                        <div className="h-3 w-20 bg-white/20 rounded mb-1" />
                      )}
                      {form.subtitle ? (
                        <p className="text-[#d1d5db] text-[8px] mb-1.5 leading-tight">{form.subtitle}</p>
                      ) : (
                        <div className="h-2 w-14 bg-white/10 rounded mb-1.5" />
                      )}
                      <div className="bg-[#b2ea0f] text-black font-black text-[8px] px-2 py-0.5 rounded w-fit">
                        {form.button_text || 'Comprar Agora'}
                      </div>
                    </div>
                  </div>
                  <p className="text-[#555] text-[10px] mt-1.5 text-center">Prévia aproximada · tamanho real é maior</p>
                </div>
              </div>
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
