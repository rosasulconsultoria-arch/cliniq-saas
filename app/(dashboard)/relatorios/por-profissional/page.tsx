import { Suspense } from 'react'
import { getFaturamentoPorProfissional } from '@/lib/relatorios'
import { periodoToRange, PeriodoRelatorio } from '@/components/relatorios/periodo-relatorio'
import { ExportButtons } from '@/components/relatorios/export-buttons'
import { getSearchParam, formatBRL } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PorProfissionalChart } from '@/components/relatorios/por-profissional-chart'

interface Props { searchParams: Record<string, string | string[] | undefined> }

async function exportCSV(inicio: string, fim: string) {
  'use server'
  const { getFaturamentoPorProfissional: getFat } = await import('@/lib/relatorios')
  const dados = await getFat(inicio, fim)
  const header = 'Profissional,Consultas,Faturamento'
  const rows = dados.map(d => [`"${d.profissional}"`, d.consultas, d.faturamento.toFixed(2)].join(','))
  return [header, ...rows].join('\n')
}

export default async function RelatorioPorProfissionalPage({ searchParams }: Props) {
  const preset = getSearchParam(searchParams.periodo, 'mes_atual')
  const { inicio, fim } = periodoToRange(preset, getSearchParam(searchParams.de), getSearchParam(searchParams.ate))
  const dados = await getFaturamentoPorProfissional(inicio, fim)
  const total = dados.reduce((s, r) => s + r.faturamento, 0)
  const csvAction = exportCSV.bind(null, inicio, fim)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-emerald-600">{formatBRL(total)}</span>
          {' '}· {dados.length} profissional(is)
        </p>
        <div className="flex gap-2">
          <Suspense><PeriodoRelatorio /></Suspense>
          <ExportButtons onExportCSV={csvAction} filename="por-profissional" />
        </div>
      </div>

      {dados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Nenhum dado no período.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <PorProfissionalChart dados={dados} />
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Consultas</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map(r => (
                  <TableRow key={r.profissional}>
                    <TableCell className="font-medium">{r.profissional}</TableCell>
                    <TableCell className="text-right">{r.consultas}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">{formatBRL(r.faturamento)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatBRL(r.consultas > 0 ? r.faturamento / r.consultas : 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
