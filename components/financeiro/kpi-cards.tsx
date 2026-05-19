import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Home } from 'lucide-react'
import { formatBRL } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface KPI {
  titulo: string
  valor: number
  icone: typeof DollarSign
  cor: string
  tooltip: string
}

interface Props {
  receitaMes: number
  despesaMes: number
  investimentosMes: number
  lucroLiquido: number
  comissoesPendentes: number
  alugueisPendentes: number
}

export function KPICards(props: Props) {
  const kpis: KPI[] = [
    {
      titulo: 'Receita do Mês',
      valor: props.receitaMes,
      icone: TrendingUp,
      cor: 'text-emerald-600',
      tooltip: 'Soma de todas as transações do tipo Receita com status Pago no mês atual. Inclui consultas realizadas e recebimentos de aluguéis.',
    },
    {
      titulo: 'Despesas do Mês',
      valor: props.despesaMes,
      icone: TrendingDown,
      cor: 'text-red-500',
      tooltip: 'Total de despesas operacionais com status Pago no mês atual (aluguel do espaço, serviços, material de escritório etc.).',
    },
    {
      titulo: 'Lucro Líquido',
      valor: props.lucroLiquido,
      icone: DollarSign,
      cor: props.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-500',
      tooltip: 'Receita do mês menos Despesas e Investimentos do mês. Representa o resultado financeiro líquido da clínica no período.',
    },
    {
      titulo: 'Comissões a Receber',
      valor: props.comissoesPendentes,
      icone: AlertCircle,
      cor: 'text-amber-500',
      tooltip: 'Total de comissões que os profissionais comissionados ainda devem repassar à clínica pelos atendimentos já realizados. Acumula todos os meses em aberto.',
    },
    {
      titulo: 'Aluguéis Pendentes',
      valor: props.alugueisPendentes,
      icone: Home,
      cor: 'text-blue-500',
      tooltip: 'Total de aluguéis mensais de profissionais locatários que ainda não foram recebidos. Acumula todos os meses em aberto.',
    },
    {
      titulo: 'Investimentos',
      valor: props.investimentosMes,
      icone: DollarSign,
      cor: 'text-violet-500',
      tooltip: 'Soma dos investimentos pagos no mês (equipamentos, reformas, tecnologia etc.). São separados das despesas operacionais.',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icone
        return (
          <Card key={kpi.titulo} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.titulo}</CardTitle>
                <InfoTooltip text={kpi.tooltip} />
              </div>
              <div className={cn('rounded-md p-1.5 bg-slate-100 dark:bg-slate-800', kpi.cor)}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className={cn('text-2xl font-bold tracking-tight', kpi.cor)}>
                {formatBRL(kpi.valor)}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
