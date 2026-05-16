import { Suspense } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getFaturamentoPorPeriodo } from '@/lib/relatorios'
import { periodoToRange } from '@/lib/periodo-utils'
import { PeriodoRelatorio } from '@/components/relatorios/periodo-relatorio'
import { ExportButtons } from '@/components/relatorios/export-buttons'
import { getSearchParam, formatBRL } from '@/lib/utils'

interface Props { searchParams: Record<string, string | string[] | undefined> }

export default async function RelatorioFaturamentoPage({ searchParams }: Props) {
  const preset = getSearchParam(searchParams.periodo, 'mes_atual')
  const { inicio, fim } = periodoToRange(preset, getSearchParam(searchParams.de), getSearchParam(searchParams.ate))
  const dados = await getFaturamentoPorPeriodo(inicio, fim)

  const total = dados.reduce((s, r) => s + r.valor, 0)
  const pago = dados.filter(r => r.status === 'PAGO').reduce((s, r) => s + r.valor, 0)

  const csvHref = `/api/relatorios/csv?tipo=faturamento&inicio=${inicio}&fim=${fim}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-emerald-600">{formatBRL(total)}</span>
            {' '}· Recebido: <span className="font-semibold text-emerald-700">{formatBRL(pago)}</span>
            {' '}· {dados.length} registros
          </p>
        </div>
        <div className="flex gap-2">
          <Suspense><PeriodoRelatorio /></Suspense>
          <ExportButtons csvHref={csvHref} filename="faturamento" />
        </div>
      </div>

      {dados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Nenhum dado no período selecionado.</div>
      ) : (
        <div className="rounded-lg border bg-card print:border-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm whitespace-nowrap">{format(r.data, 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{r.descricao}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.categoria.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.formaPagamento ?? '—'}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">{formatBRL(r.valor)}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === 'PAGO' ? 'outline' : 'secondary'} className={r.status === 'PAGO' ? 'border-green-400 text-green-600' : 'text-amber-600'}>
                      {r.status === 'PAGO' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
