import { getFluxoCaixa } from '@/lib/fluxo-caixa'
import { periodoToRange } from '@/lib/periodo-utils'
import { getSearchParam, formatBRL } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Suspense } from 'react'
import { PeriodoRelatorio } from '@/components/relatorios/periodo-relatorio'
import { FluxoCaixaChart } from '@/components/financeiro/fluxo-caixa-chart'
import { TrendingUp, TrendingDown, Wallet, ArrowRightLeft } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function FluxoCaixaPage(props: Props) {
  const searchParams = await props.searchParams;
  const preset = getSearchParam(searchParams.periodo, 'mes_atual')
  const { inicio, fim } = periodoToRange(preset, getSearchParam(searchParams.de), getSearchParam(searchParams.ate))
  const d = await getFluxoCaixa(inicio, fim)

  const cards = [
    { titulo: 'Saldo Inicial', valor: d.saldoInicial, icon: Wallet, cor: 'text-slate-600', tooltip: 'Saldo acumulado até o início do período selecionado — soma de todas as receitas pagas menos despesas pagas antes dessa data.' },
    { titulo: 'Total de Entradas', valor: d.totalEntradas, icon: TrendingUp, cor: 'text-emerald-600', tooltip: 'Soma de todas as receitas com status Pago no período: consultas realizadas, aluguéis recebidos e outras receitas.' },
    { titulo: 'Total de Saídas', valor: d.totalSaidas, icon: TrendingDown, cor: 'text-red-500', tooltip: 'Soma de todas as despesas e investimentos com status Pago no período selecionado.' },
    { titulo: 'Saldo Final', valor: d.saldoFinal, icon: ArrowRightLeft, cor: d.saldoFinal >= 0 ? 'text-emerald-600' : 'text-red-500', tooltip: 'Saldo Inicial + Total de Entradas − Total de Saídas. Representa a posição financeira real ao final do período.' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Suspense><PeriodoRelatorio /></Suspense>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <Card key={c.titulo} className="shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{c.titulo}</p>
                  <div className="flex items-center gap-1.5">
                    <InfoTooltip text={c.tooltip} />
                    <Icon className={`h-4 w-4 ${c.cor} opacity-70`} />
                  </div>
                </div>
                <p className={`text-xl font-bold ${c.cor}`}>{formatBRL(c.valor)}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Gráfico */}
      <FluxoCaixaChart dados={d.fluxoDiario} />

      {/* Tabela de lançamentos */}
      {d.lancamentos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <p className="text-sm">Nenhum lançamento no período.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lançamentos do Período</h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.lancamentos.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(parseISO(l.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{l.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.categoria}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        l.tipo === 'RECEITA' ? 'border-emerald-400 text-emerald-600' :
                        l.tipo === 'DESPESA' ? 'border-red-400 text-red-500' :
                        'border-purple-400 text-purple-600'
                      }>
                        {l.tipo === 'RECEITA' ? 'Receita' : l.tipo === 'DESPESA' ? 'Despesa' : 'Investimento'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${l.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {l.tipo === 'RECEITA' ? '+' : '−'}{formatBRL(l.valor)}
                    </TableCell>
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
