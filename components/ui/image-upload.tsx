'use client'

import { useRef, useState } from 'react'
import { Upload, X, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  value?: string | null
  onChange: (base64: string | null) => void
  shape?: 'square' | 'circle'
  maxKB?: number
  label?: string
}

async function compressImage(file: File, maxKB: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const maxDim = 800
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round((height * maxDim) / width); width = maxDim }
        else { width = Math.round((width * maxDim) / height); height = maxDim }
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)

      let quality = 0.85
      let result = canvas.toDataURL('image/jpeg', quality)
      while (result.length > maxKB * 1024 * 1.37 && quality > 0.3) {
        quality -= 0.1
        result = canvas.toDataURL('image/jpeg', quality)
      }
      resolve(result)
    }
    img.onerror = reject
    img.src = url
  })
}

export function ImageUpload({ value, onChange, shape = 'square', maxKB = 300, label = 'Imagem' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const isCircle = shape === 'circle'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Apenas JPEG, PNG ou WebP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande (máx. 5MB)')
      return
    }

    try {
      const compressed = await compressImage(file, maxKB)
      onChange(compressed)
    } catch {
      setError('Erro ao processar imagem')
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div
          className={cn(
            'flex items-center justify-center bg-muted overflow-hidden shrink-0 border',
            isCircle ? 'h-16 w-16 rounded-full' : 'h-16 w-16 rounded-lg'
          )}
        >
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <User className="h-7 w-7 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {value ? 'Trocar' : `Enviar ${label}`}
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">JPEG ou PNG · max 5MB</p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  )
}
