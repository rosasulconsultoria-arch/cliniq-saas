import { Suspense } from 'react'
import { getDespesasPorCategoria } from '@/lib/relatorios'
import { periodoToRange, PeriodoRelatorio } from '@/components/relatorios/periodo-relatorio'
import { ExportButtons } from '@/components/relatorios/export-buttons'
import { getSearchParam, formatBRL } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DespesasCategoriaChart } from '@/components/financeiro/despesas-categoria-chart'

interface Props { searchParams: Record<string, string | string[] | undefined> }

async function exportCSV(ini: string, fi: string) {
  'use server'
  const { getDespesasPorCategoria: getFat } = await import('@/lib/relatorios')
  const dados = await getFat(ini, fi)
  const header = 'Categoria,Total,Pago,Pendente'
  return [header, ...dados.map(d => [`"${d.nome}"`, d.total.toFixed(2), d.pago.toFixed(2), d.pendente.toFixed(2)].join(','))].join('\n')
}

export default async function RelatorioDespesasCategoriaPage({ searchParams }: Props) {
  const preset = getSearchParam(searchParams.periodo, 'mes_atual')
  const { inicio, fim } = periodoToRange(preset, getSearchParam(searchParams.de), getSearchParam(searchParams.ate))
  const dados = await getDespesasPorCategoria(inicio, fim)
  const total = dados.reduce((s, r) => s + r.total, 0)
  const csvAction = exportCSV.bind(null, inicio, fim)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Total despesas: <span className="font-semibold text-red-500">{formatBRL(total)}</span></p>
        <div className="flex gap-2">
          <Suspense><PeriodoRelatorio /></Suspense>
          <ExportButtons onExportCSV={csvAction} filename="despesas-categoria" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <DespesasCategoriaChart dados={dados} />
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Pendente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">Nenhum dado no período.</TableCell></TableRow>
              ) : dados.map(r => (
                <TableRow key={r.nome}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.cor }} />
                      <span className="font-medium">{r.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-500">{formatBRL(r.total)}</TableCell>
                  <TableCell className="text-right text-emerald-600">{formatBRL(r.pago)}</TableCell>
                  <TableCell className="text-right text-amber-500">{formatBRL(r.pendente)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
