import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Home } from 'lucide-react'
import { formatBRL } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface KPI {
  titulo: string
  valor: number
  icone: typeof DollarSign
  cor: string
  descricao?: string
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
    { titulo: 'Receita do Mês', valor: props.receitaMes, icone: TrendingUp, cor: 'text-emerald-600', descricao: 'Transações pagas' },
    { titulo: 'Despesas do Mês', valor: props.despesaMes, icone: TrendingDown, cor: 'text-red-500', descricao: 'Transações pagas' },
    { titulo: 'Lucro Líquido', valor: props.lucroLiquido, icone: DollarSign, cor: props.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-500', descricao: 'Receita − Despesa' },
    { titulo: 'Comissões Pendentes', valor: props.comissoesPendentes, icone: AlertCircle, cor: 'text-amber-500', descricao: 'A pagar para profissionais' },
    { titulo: 'Aluguéis Pendentes', valor: props.alugueisPendentes, icone: Home, cor: 'text-blue-500', descricao: 'A receber de locatários' },
    { titulo: 'Investimentos', valor: props.investimentosMes, icone: DollarSign, cor: 'text-violet-500', descricao: 'No mês atual' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icone
        return (
          <Card key={kpi.titulo} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.titulo}</CardTitle>
              <div className={cn('rounded-md p-1.5 bg-slate-100 dark:bg-slate-800', kpi.cor)}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className={cn('text-2xl font-bold tracking-tight', kpi.cor)}>
                {formatBRL(kpi.valor)}
              </p>
              {kpi.descricao && <p className="text-xs text-muted-foreground mt-1">{kpi.descricao}</p>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
