import { Suspense } from 'react'
import { getComissoesPorProfissional } from '@/lib/relatorios'
import { periodoToRange, PeriodoRelatorio } from '@/components/relatorios/periodo-relatorio'
import { ExportButtons } from '@/components/relatorios/export-buttons'
import { getSearchParam, formatBRL } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

interface Props { searchParams: Record<string, string | string[] | undefined> }

async function exportCSV(ini: string, fi: string) {
  'use server'
  const { getComissoesPorProfissional: get } = await import('@/lib/relatorios')
  const dados = await get(ini, fi)
  const header = 'Profissional,Consultas,Total Comissão,Pago,Pendente'
  return [header, ...dados.map(d => [`"${d.nome}"`, d.count, d.total.toFixed(2), d.pago.toFixed(2), d.pendente.toFixed(2)].join(','))].join('\n')
}

export default async function RelatorioComissoesPage({ searchParams }: Props) {
  const preset = getSearchParam(searchParams.periodo, 'mes_atual')
  const { inicio, fim } = periodoToRange(preset, getSearchParam(searchParams.de), getSearchParam(searchParams.ate))
  const dados = await getComissoesPorProfissional(inicio, fim)
  const totalGeral = dados.reduce((s, r) => s + r.total, 0)
  const maxTotal = Math.max(...dados.map(d => d.total), 1)
  const csvAction = exportCSV.bind(null, inicio, fim)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Total comissões: <span className="font-semibold text-amber-600">{formatBRL(totalGeral)}</span></p>
        <div className="flex gap-2">
          <Suspense><PeriodoRelatorio /></Suspense>
          <ExportButtons onExportCSV={csvAction} filename="comissoes-profissional" />
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead className="text-right">Consultas</TableHead>
              <TableHead className="text-right">Total Comissão</TableHead>
              <TableHead className="text-right">Pago</TableHead>
              <TableHead className="text-right">Pendente</TableHead>
              <TableHead>Distribuição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">Nenhum dado no período.</TableCell></TableRow>
            ) : dados.map(r => (
              <TableRow key={r.nome}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-right">{r.count}</TableCell>
                <TableCell className="text-right font-semibold text-amber-600">{formatBRL(r.total)}</TableCell>
                <TableCell className="text-right text-emerald-600">{formatBRL(r.pago)}</TableCell>
                <TableCell className="text-right text-red-500">{formatBRL(r.pendente)}</TableCell>
                <TableCell className="w-32"><Progress value={(r.total / maxTotal) * 100} className="h-2" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
