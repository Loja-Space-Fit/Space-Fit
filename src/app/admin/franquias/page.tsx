'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Pencil, X, Plus, Trash2, ImageOff, Info } from 'lucide-react'
import toast from 'react-hot-toast'

type Region = {
  id: string
  value: string
  label: string
  state: string
}

type FranchiseContent = {
  region_value: string
  history: string
  images: string[]
}

type ModalState = {
  region: Region
  history: string
  images: string[]
  saving: boolean
  uploading: boolean
}

export default function AdminFranquiasPage() {
  const [regions, setRegions] = useState<Region[]>([])
  const [franchises, setFranchises] = useState<Map<string, FranchiseContent>>(new Map())
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function fetchAll() {
    const supabase = createClient()
    const [{ data: r }, { data: f }] = await Promise.all([
      supabase.from('academy_regions').select('id, value, label, state').order('display_order'),
      supabase.from('franchise_content').select('region_value, history, images'),
    ])
    setRegions((r || []) as Region[])
    const map = new Map<string, FranchiseContent>()
    for (const row of (f || []) as FranchiseContent[]) {
      map.set(row.region_value, row)
    }
    setFranchises(map)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  function openModal(region: Region) {
    const existing = franchises.get(region.value)
    setModal({
      region,
      history: existing?.history ?? '',
      images: existing?.images ?? [],
      saving: false,
      uploading: false,
    })
  }

  function closeModal() {
    setModal(null)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !modal) return

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { toast.error('Use JPG, PNG ou WEBP.'); return }
    if (file.size > 20 * 1024 * 1024) { toast.error('Imagem excede 20 MB.'); return }

    setModal(m => m ? { ...m, uploading: true } : m)
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'jpg'
    const fileName = `franquias/${modal.region.value}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage.from('product-images').upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

    if (error) {
      toast.error(`Erro ao enviar imagem: ${error.message}`)
      setModal(m => m ? { ...m, uploading: false } : m)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName)
    setModal(m => m ? { ...m, images: [...m.images, publicUrl], uploading: false } : m)
    toast.success('Imagem adicionada!')
  }

  async function handleRemoveImage(url: string) {
    if (!modal) return
    setModal(m => m ? { ...m, images: m.images.filter(i => i !== url) } : m)
    try {
      const supabase = createClient()
      const parts = url.split('/product-images/')
      if (parts.length === 2) await supabase.storage.from('product-images').remove([parts[1]])
    } catch { /* silencioso */ }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!modal) return

    setModal(m => m ? { ...m, saving: true } : m)
    const supabase = createClient()

    const payload = {
      region_value: modal.region.value,
      history: modal.history,
      images: modal.images,
    }

    const { error } = await supabase
      .from('franchise_content')
      .upsert(payload, { onConflict: 'region_value' })

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`)
      setModal(m => m ? { ...m, saving: false } : m)
      return
    }

    toast.success('Conteúdo salvo!')
    await fetchAll()
    closeModal()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">

      <div className="flex items-center gap-3 mb-8">
        <Building2 className="w-6 h-6 text-[#b2ea0f]" />
        <div>
          <h1 className="text-2xl font-black text-white">Franquias</h1>
          <p className="text-[#9ca3af] text-sm">Edite a história e as imagens de cada unidade</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 mb-6">
        <Info className="w-4 h-4 text-[#b2ea0f] shrink-0 mt-0.5" />
        <p className="text-[#9ca3af] text-sm">
          As franquias são baseadas nas{' '}
          <a href="/admin/planos" className="text-[#b2ea0f] hover:underline font-semibold">
            regiões cadastradas
          </a>
          . Para adicionar uma nova cidade, primeiro crie a região na aba <strong className="text-white">Regiões</strong> em Planos.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-[#9ca3af] py-16">Carregando...</div>
      ) : regions.length === 0 ? (
        <div className="text-center text-[#9ca3af] py-16">
          <Building2 className="w-10 h-10 text-[#2a2a2a] mx-auto mb-3" />
          <p>Nenhuma região cadastrada.</p>
          <a href="/admin/planos" className="text-[#b2ea0f] text-sm hover:underline mt-2 inline-block">
            Ir para Planos → Regiões
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {regions.map(region => {
            const content = franchises.get(region.value)
            const hasContent = !!(content?.history || (content?.images && content.images.length > 0))
            return (
              <div
                key={region.value}
                className="bg-[#111111] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-2xl p-5 flex flex-col gap-4 transition-colors"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-black text-base leading-tight">{region.label}</p>
                    <p className="text-[#9ca3af] text-xs font-semibold mt-0.5">{region.state}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                    hasContent ? 'bg-[#b2ea0f]/20 text-[#b2ea0f]' : 'bg-[#2a2a2a] text-[#555]'
                  }`}>
                    {hasContent ? 'Preenchido' : 'Vazio'}
                  </span>
                </div>

                {/* Preview */}
                <div className="flex-1 space-y-1.5">
                  {content?.history ? (
                    <p className="text-[#9ca3af] text-xs line-clamp-3 leading-relaxed">{content.history}</p>
                  ) : (
                    <p className="text-[#555] text-xs italic">Sem história cadastrada.</p>
                  )}
                  {content?.images && content.images.length > 0 && (
                    <p className="text-[#b2ea0f] text-xs font-semibold">
                      {content.images.length} imagem{content.images.length !== 1 ? 'ns' : ''}
                    </p>
                  )}
                </div>

                {/* Edit button */}
                <button
                  onClick={() => openModal(region)}
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#b2ea0f]/10 hover:bg-[#b2ea0f]/20 border border-[#b2ea0f]/20 hover:border-[#b2ea0f]/40 text-[#b2ea0f] text-sm font-bold transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar conteúdo
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#2a2a2a] sticky top-0 bg-[#111111] z-10">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-[#b2ea0f]" />
                <div>
                  <h2 className="text-white font-black text-base">{modal.region.label}</h2>
                  <p className="text-[#9ca3af] text-xs">{modal.region.state}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9ca3af] hover:text-white hover:bg-[#2a2a2a] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6">

              {/* History textarea */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  História da unidade
                </label>
                <textarea
                  value={modal.history}
                  onChange={e => setModal(m => m ? { ...m, history: e.target.value } : m)}
                  rows={6}
                  placeholder="Conte a história desta academia — quando foi fundada, estrutura, diferenciais..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-[#555] text-sm focus:outline-none focus:border-[#b2ea0f]/50 resize-y"
                />
              </div>

              {/* Images */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-white">Imagens</label>
                  <button
                    type="button"
                    disabled={modal.uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#b2ea0f]/10 hover:bg-[#b2ea0f]/20 border border-[#b2ea0f]/20 text-[#b2ea0f] text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {modal.uploading ? 'Enviando...' : 'Adicionar imagem'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

                {modal.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {modal.images.map((url, i) => (
                      <div key={i} className="relative group aspect-video rounded-xl overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Foto ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(url)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-24 rounded-xl border border-dashed border-[#2a2a2a] text-[#555]">
                    <ImageOff className="w-5 h-5 mb-1" />
                    <p className="text-xs">Nenhuma imagem ainda</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-[#9ca3af] hover:text-white hover:border-[#3a3a3a] text-sm font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modal.saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#b2ea0f] hover:bg-[#c8f040] text-black text-sm font-black transition-all disabled:opacity-50"
                >
                  {modal.saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
