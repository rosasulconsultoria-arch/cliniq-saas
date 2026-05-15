'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Download, Printer, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onExportCSV: () => Promise<string>
  filename?: string
  onPrint?: () => void
}

export function ExportButtons({ onExportCSV, filename = 'relatorio', onPrint }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleCSV() {
    startTransition(async () => {
      try {
        const csv = await onExportCSV()
        const bom = '﻿'
        const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV exportado!')
      } catch {
        toast.error('Erro ao exportar CSV')
      }
    })
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
