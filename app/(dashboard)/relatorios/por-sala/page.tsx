import { Suspense } from 'react'
import { getFaturamentoPorSala } from '@/lib/relatorios'
import { periodoToRange, PeriodoRelatorio } from '@/components/relatorios/periodo-relatorio'
import { ExportButtons } from '@/components/relatorios/export-buttons'
import { getSearchParam, formatBRL } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

interface Props { searchParams: Record<string, string | string[] | undefined> }

async function exportCSV(ini: string, fi: string) {
  'use server'
  const { getFaturamentoPorSala: getFat } = await import('@/lib/relatorios')
  const dados = await getFat(ini, fi)
  const header = 'Sala,Consultas,Faturamento'
  return [header, ...dados.map(d => [`"${d.sala}"`, d.consultas, d.faturamento.toFixed(2)].join(','))].join('\n')
}

export default async function RelatorioPorSalaPage({ searchParams }: Props) {
  const preset = getSearchParam(searchParams.periodo, 'mes_atual')
  const { inicio, fim } = periodoToRange(preset, getSearchParam(searchParams.de), getSearchParam(searchParams.ate))
  const dados = await getFaturamentoPorSala(inicio, fim)
  const maxFat = Math.max(...dados.map(d => d.faturamento), 1)
  const csvAction = exportCSV.bind(null, inicio, fim)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{dados.length} sala(s) com agendamentos no período</p>
        <div className="flex gap-2">
          <Suspense><PeriodoRelatorio /></Suspense>
          <ExportButtons onExportCSV={csvAction} filename="por-sala" />
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sala</TableHead>
              <TableHead className="text-right">Consultas</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead>Ocupação Relativa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">Nenhum dado no período.</TableCell></TableRow>
            ) : dados.map(r => (
              <TableRow key={r.sala}>
                <TableCell className="font-medium">{r.sala}</TableCell>
                <TableCell className="text-right">{r.consultas}</TableCell>
                <TableCell className="text-right font-semibold text-emerald-600">{formatBRL(r.faturamento)}</TableCell>
                <TableCell className="w-40">
                  <Progress value={(r.faturamento / maxFat) * 100} className="h-2" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
