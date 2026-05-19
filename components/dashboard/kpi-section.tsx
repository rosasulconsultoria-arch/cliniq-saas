import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { TrendingUp, TrendingDown, DollarSign, Calendar, Activity, Target, UserX } from 'lucide-react'
import { formatBRL } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface KPI { valor: number; variacao: number }
interface KPIs {
  faturamento: KPI; despesas: KPI; lucro: KPI; consultas: KPI
  ocupacao: KPI; ticketMedio: KPI; noShow: KPI
}

function TrendBadge({ variacao, invertido = false }: { variacao: number; invertido?: boolean }) {
  if (variacao === 0) return <span className="text-xs text-muted-foreground">—</span>
  const isGood = invertido ? variacao < 0 : variacao > 0
  const Icon = variacao > 0 ? TrendingUp : TrendingDown
  return (
    <span className={cn('flex items-center gap-0.5 text-xs font-medium', isGood ? 'text-emerald-600' : 'text-red-500')}>
      <Icon className="h-3 w-3" />
      {Math.abs(variacao).toFixed(1)}%
    </span>
  )
}

export function KPISection({ kpis }: { kpis: KPIs }) {
  const cards = [
    {
      titulo: 'Faturamento',
      valor: formatBRL(kpis.faturamento.valor),
      variacao: kpis.faturamento.variacao,
      icone: DollarSign,
      cor: 'text-emerald-600',
      tooltip: 'Soma de todas as receitas pagas (consultas, aluguéis e outras) no período selecionado.',
    },
    {
      titulo: 'Despesas',
      valor: formatBRL(kpis.despesas.valor),
      variacao: kpis.despesas.variacao,
      icone: TrendingDown,
      cor: 'text-red-500',
      invertido: true,
      tooltip: 'Total de despesas operacionais pagas no período (contas, materiais, serviços contratados etc.).',
    },
    {
      titulo: 'Lucro Líquido',
      valor: formatBRL(kpis.lucro.valor),
      variacao: kpis.lucro.variacao,
      icone: Target,
      cor: kpis.lucro.valor >= 0 ? 'text-emerald-600' : 'text-red-500',
      tooltip: 'Faturamento menos Despesas, Comissões pagas e Investimentos. Representa o resultado real do período.',
    },
    {
      titulo: 'Consultas',
      valor: kpis.consultas.valor.toString(),
      variacao: kpis.consultas.variacao,
      icone: Calendar,
      cor: 'text-blue-600',
      tooltip: 'Total de agendamentos com status Realizado ou Confirmado no período. Não inclui cancelamentos.',
    },
    {
      titulo: 'Taxa de Ocupação',
      valor: `${kpis.ocupacao.valor.toFixed(1)}%`,
      variacao: kpis.ocupacao.variacao,
      icone: Activity,
      cor: 'text-violet-600',
      tooltip: 'Percentual de slots de 50 min utilizados em relação à capacidade total das salas no período.',
    },
    {
      titulo: 'Ticket Médio',
      valor: formatBRL(kpis.ticketMedio.valor),
      variacao: kpis.ticketMedio.variacao,
      icone: DollarSign,
      cor: 'text-amber-600',
      tooltip: 'Valor médio por consulta realizada no período. Calculado como Faturamento ÷ Nº de consultas.',
    },
    {
      titulo: 'Taxa de No-Show',
      valor: `${kpis.noShow.valor.toFixed(1)}%`,
      variacao: kpis.noShow.variacao,
      icone: UserX,
      cor: 'text-rose-500',
      invertido: true,
      tooltip: 'Percentual de pacientes que não compareceram sem cancelamento prévio. Calculado sobre o total de agendamentos do período.',
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((c) => {
        const Icon = c.icone
        return (
          <Card key={c.titulo} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{c.titulo}</CardTitle>
              <div className="flex items-center gap-1">
                <InfoTooltip text={c.tooltip} />
                <Icon className={cn('h-3.5 w-3.5 shrink-0', c.cor)} />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className={cn('text-xl font-bold tracking-tight', c.cor)}>{c.valor}</p>
              <TrendBadge variacao={c.variacao} invertido={c.invertido} />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
