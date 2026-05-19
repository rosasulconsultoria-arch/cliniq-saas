'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Download, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  csvHref: string
  filename?: string
  onPrint?: () => void
}


export function ExportButtons({ csvHref, filename = 'relatorio', onPrint }: Props) {
  const [csvPending, setCsvPending] = useState(false)
  const [pdfPending, setPdfPending] = useState(false)

  async function handleCSV() {
    setCsvPending(true)
    try {
      const res = await fetch(csvHref)
      if (!res.ok) throw new Error()
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
      setCsvPending(false)
    }
  }

  async function handlePDF() {
    if (onPrint) { onPrint(); return }
    setPdfPending(true)
    try {
      const { downloadRelatorioPDF } = await import('@/lib/pdf-client')
      await downloadRelatorioPDF(csvHref, filename)
      toast.success('PDF baixado!')
    } catch {
      toast.error('Erro ao gerar PDF')
    } finally {
      setPdfPending(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleCSV} disabled={csvPending}>
        {csvPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
        Exportar CSV
      </Button>
      <Button variant="outline" size="sm" onClick={handlePDF} disabled={pdfPending}>
        {pdfPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
        Exportar PDF
      </Button>
    </div>
  )
}
