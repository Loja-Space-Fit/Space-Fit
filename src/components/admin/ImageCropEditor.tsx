'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react'

interface Area {
  x: number
  y: number
  width: number
  height: number
}

interface Props {
  imageSrc: string
  onDone: (croppedBlob: Blob) => void
  onCancel: () => void
  initialAspect?: number
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = imageSrc
  })

  const rad = (rotation * Math.PI) / 180

  // Safe area: grande o suficiente para conter a imagem em qualquer ângulo de rotação
  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  const canvas = document.createElement('canvas')
  canvas.width = safeArea
  canvas.height = safeArea
  const ctx = canvas.getContext('2d')!

  // Rotaciona ao redor do centro do safe area
  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate(rad)
  ctx.translate(-safeArea / 2, -safeArea / 2)

  // Desenha a imagem centralizada no safe area
  ctx.drawImage(image, safeArea / 2 - image.width / 2, safeArea / 2 - image.height / 2)

  // Captura os pixels do safe area inteiro
  const data = ctx.getImageData(0, 0, safeArea, safeArea)

  // Redimensiona o canvas para o tamanho do crop e cola os pixels com offset correto
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y)
  )

  return new Promise(resolve => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.92))
}

export default function ImageCropEditor({ imageSrc, onDone, onCancel, initialAspect = 1 }: Props) {
  const [crop, setCrop]         = useState({ x: 0, y: 0 })
  const [zoom, setZoom]         = useState(1)
  const [rotation, setRotation] = useState(0)
  const [aspect, setAspect]     = useState(initialAspect)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [processing, setProcessing]   = useState(false)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedArea) return
    setProcessing(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedArea, rotation)
      onDone(blob)
    } finally {
      setProcessing(false)
    }
  }

  const aspects = [
    { label: '1:1',  value: 1 },
    { label: '4:3',  value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '21:9', value: 21 / 9 },
    { label: 'Livre', value: 0 },
  ]

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#111111]">
        <h3 className="text-white font-black text-sm">Ajustar Imagem</h3>
        <button onClick={onCancel} className="text-[#9ca3af] hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Área de crop */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect || undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#0a0a0a' },
          }}
        />
      </div>

      {/* Controles */}
      <div className="bg-[#111111] border-t border-[#2a2a2a] px-4 py-4 space-y-4">
        {/* Proporção */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#9ca3af] w-16 shrink-0">Proporção</span>
          <div className="flex gap-2">
            {aspects.map(a => (
              <button
                key={a.label}
                onClick={() => setAspect(a.value)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  aspect === a.value
                    ? 'bg-[#b2ea0f] border-[#b2ea0f] text-black'
                    : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#9ca3af] hover:border-[#b2ea0f]/50'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#9ca3af] w-16 shrink-0">Zoom</span>
          <button onClick={() => setZoom(z => Math.max(1, z - 0.1))} className="text-[#9ca3af] hover:text-white">
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range" min={1} max={3} step={0.05} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#b2ea0f]"
          />
          <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="text-[#9ca3af] hover:text-white">
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#9ca3af] w-10 text-right">{zoom.toFixed(1)}x</span>
        </div>

        {/* Rotação */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#9ca3af] w-16 shrink-0">Rotação</span>
          <button onClick={() => setRotation(r => r - 90)} className="text-[#9ca3af] hover:text-white">
            <RotateCw className="w-4 h-4 scale-x-[-1]" />
          </button>
          <input
            type="range" min={-180} max={180} step={1} value={rotation}
            onChange={e => setRotation(Number(e.target.value))}
            className="flex-1 accent-[#b2ea0f]"
          />
          <button onClick={() => setRotation(r => r + 90)} className="text-[#9ca3af] hover:text-white">
            <RotateCw className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#9ca3af] w-10 text-right">{rotation}°</span>
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="btn-outline flex-1 text-sm">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="btn-green flex-1 text-sm gap-2"
          >
            {processing ? 'Processando...' : <><Check className="w-4 h-4" /> Confirmar</>}
          </button>
        </div>
      </div>
    </div>
  )
}
