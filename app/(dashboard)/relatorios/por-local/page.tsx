import { Suspense } from 'react'
import { getFaturamentoPorLocal } from '@/lib/relatorios'
import { runWithTenant } from '@/lib/tenant-context'
import { getCurrentTenant } from '@/lib/tenant-header'
import { periodoToRange } from '@/lib/periodo-utils'
import { PeriodoRelatorio } from '@/components/relatorios/periodo-relatorio'
import { ExportButtons } from '@/components/relatorios/export-buttons'
import { getSearchParam, formatBRL } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function RelatorioPorLocalPage(props: Props) {
  const searchParams = await props.searchParams;
  const preset = getSearchParam(searchParams.periodo, 'mes_atual')
  const { inicio, fim } = periodoToRange(preset, getSearchParam(searchParams.de), getSearchParam(searchParams.ate))
  const { id: tenantId } = await getCurrentTenant()
  const dados = await runWithTenant(tenantId, () => getFaturamentoPorLocal(inicio, fim))
  const maxFat = Math.max(...dados.map(d => d.faturamento), 1)

  const csvHref = `/api/relatorios/csv?tipo=por-local&inicio=${inicio}&fim=${fim}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{dados.length} local(is) com agendamentos no período</p>
        <div className="flex gap-2">
          <Suspense><PeriodoRelatorio /></Suspense>
          <ExportButtons csvHref={csvHref} filename="por-local" />
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Consultas</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead>Ocupação Relativa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-12">Nenhum dado no período.</TableCell></TableRow>
            ) : dados.map(r => (
              <TableRow key={r.local}>
                <TableCell className="font-medium">{r.local}</TableCell>
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
