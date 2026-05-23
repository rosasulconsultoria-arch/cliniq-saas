import { Suspense } from 'react'
import { getOcupacaoPorLocal } from '@/lib/relatorios'
import { periodoToRange } from '@/lib/periodo-utils'
import { PeriodoRelatorio } from '@/components/relatorios/periodo-relatorio'
import { ExportButtons } from '@/components/relatorios/export-buttons'
import { getSearchParam } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface Props { searchParams: Record<string, string | string[] | undefined> }

export default async function RelatorioOcupacaoPage({ searchParams }: Props) {
  const preset = getSearchParam(searchParams.periodo, 'mes_atual')
  const { inicio, fim } = periodoToRange(preset, getSearchParam(searchParams.de), getSearchParam(searchParams.ate))
  const dados = await getOcupacaoPorLocal(inicio, fim)

  const csvHref = `/api/relatorios/csv?tipo=ocupacao&inicio=${inicio}&fim=${fim}`

  function taxaColor(taxa: number) {
    if (taxa >= 70) return 'border-emerald-400 text-emerald-600'
    if (taxa >= 40) return 'border-amber-400 text-amber-600'
    return 'border-red-400 text-red-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{dados.length} local(is) ativo(s)</p>
        <div className="flex gap-2">
          <Suspense><PeriodoRelatorio /></Suspense>
          <ExportButtons csvHref={csvHref} filename="ocupacao-salas" />
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Local</TableHead>
              <TableHead className="text-right">Agendamentos</TableHead>
              <TableHead className="text-right">Realizados</TableHead>
              <TableHead className="text-right">Slots Disponíveis</TableHead>
              <TableHead>Taxa de Ocupação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">Nenhum dado no período.</TableCell></TableRow>
            ) : dados.map(r => (
              <TableRow key={r.local}>
                <TableCell className="font-medium">{r.local}</TableCell>
                <TableCell className="text-right">{r.agendado}</TableCell>
                <TableCell className="text-right">{r.realizado}</TableCell>
                <TableCell className="text-right text-muted-foreground">{r.slotsTotal}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={r.taxa} className="h-2 w-20" />
                    <Badge variant="outline" className={taxaColor(r.taxa)}>{r.taxa.toFixed(1)}%</Badge>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        * Taxa calculada sobre {dados[0]?.slotsTotal ?? 0} slots disponíveis (14 slots×50min/dia × dias no período).
      </p>
    </div>
  )
}
