'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  slug: string
  appUrl?: string
}

export function ProfissionalQRCode({ slug, appUrl }: Props) {
  const [copied, setCopied] = useState(false)
  const base = appUrl ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
  const url = `${base}/agendar/${slug}`

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Link de agendamento público</p>
        <div className="flex gap-2">
          <Input value={url} readOnly className="flex-1 font-mono text-xs" />
          <Button type="button" variant="outline" size="icon" onClick={copy} title="Copiar link">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="outline" size="icon" asChild title="Abrir link">
            <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 p-4 rounded-xl border bg-white dark:bg-slate-900">
        <QRCodeSVG
          value={url}
          size={160}
          level="M"
          includeMargin={false}
          className="rounded"
        />
        <p className="text-xs text-muted-foreground text-center">
          QR Code para agendamento · Escaneie para abrir
        </p>
      </div>
    </div>
  )
}
