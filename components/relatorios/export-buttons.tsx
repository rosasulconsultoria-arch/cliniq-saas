'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  csvHref: string
  filename?: string
  onPrint?: () => void
}

export function ExportButtons({ csvHref, filename = 'relatorio', onPrint }: Props) {
  const [isPending, setIsPending] = useState(false)

  async function handleCSV() {
    setIsPending(true)
    try {
      const res = await fetch(csvHref)
      if (!res.ok) throw new Error('Erro ao gerar CSV')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exportado!')
    } catch {
      toast.error('Erro ao exportar CSV')
    } finally {
      setIsPending(false)
    }
  }

  function handlePrint() {
    if (onPrint) { onPrint(); return }
    window.print()
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleCSV} disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
        Exportar CSV
      </Button>
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4 mr-1.5" />
        Imprimir / PDF
      </Button>
    </div>
  )
}
