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

const LABELS: Record<string, string> = {
  faturamento: 'Faturamento por Período',
  'por-profissional': 'Faturamento por Profissional',
  'por-sala': 'Faturamento por Sala',
  'despesas-categoria': 'Despesas por Categoria',
  dre: 'DRE — Demonstrativo de Resultado',
  comissoes: 'Comissões por Profissional',
  ocupacao: 'Ocupação por Sala',
  pacientes: 'Relatório de Pacientes',
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
      const res = await fetch(csvHref)
      if (!res.ok) throw new Error()
      const text = await res.text()

      // Remove sep= line and BOM, parse rows
      const lines = text.replace(/^﻿/, '').split('\n').filter(l => l && !l.startsWith('sep='))
      const rows = lines.map(l =>
        l.split(';').map(c => c.replace(/^"|"$/g, '').trim())
      )
      if (rows.length < 2) { toast.error('Sem dados para exportar'); return }

      const [headers, ...data] = rows
      const title = LABELS[filename] ?? filename.replace(/-/g, ' ').toUpperCase()
      const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .meta { font-size: 11px; color: #6b7280; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead tr { background: #1e1b4b; color: #fff; }
    th { padding: 9px 12px; text-align: left; font-weight: 600; font-size: 11px; letter-spacing: 0.03em; white-space: nowrap; }
    td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr:last-child td { border-bottom: none; }
    td:last-child, th:last-child { text-align: right; }
    .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: right; }
    @media print {
      body { padding: 16px; }
      thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody tr:nth-child(even) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">Gerado em ${now}</p>
  <table>
    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${data.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n      ')}
    </tbody>
  </table>
  <div class="footer">Clínica de Psicologia — ${now}</div>
  <script>window.onload = () => { window.print() }<\/script>
</body>
</html>`

      const w = window.open('', '_blank', 'width=900,height=700')
      if (w) {
        w.document.open()
        w.document.write(html)
        w.document.close()
      } else {
        toast.error('Popup bloqueado. Permita popups para este site.')
      }
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
