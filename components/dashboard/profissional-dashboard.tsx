import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/utils'
import { getDashboardProfissional } from '@/lib/dashboard-profissional'
import {
  TrendingUp,
  CalendarCheck,
  Users,
  UserX,
  AlertCircle,
  Clock,
  Wallet,
  Receipt,
} from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'

const STATUS_COLORS: Record<string, string> = {
  AGENDADO: 'border-blue-400 text-blue-600',
  CONFIRMADO: 'border-green-400 text-green-600',
  REALIZADO: 'text-slate-500',
  FALTOU: 'border-amber-400 text-amber-600',
}
const STATUS_LABELS: Record<string, string> = {
  AGENDADO: 'Agendado',
  CONFIRMADO: 'Confirmado',
  REALIZADO: 'Realizado',
  FALTOU: 'Faltou',
}

interface Props {
  profissionalId: string
  nome: string
}

export async function ProfissionalDashboard({ profissionalId, nome }: Props) {
  const d = await getDashboardProfissional(profissionalId)

  const kpis: { titulo: string; valor: string; sub: string; icon: typeof TrendingUp; cor: string; bg: string; tooltip?: string }[] = [
    {
      titulo: 'Faturamento este mês',
      valor: formatBRL(d.faturamentoMes),
      sub: `${d.consultasMes} consultas realizadas`,
      icon: TrendingUp,
      cor: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      tooltip: 'Soma dos valores de todas as consultas com status Realizado no mês atual.',
    },
    {
      titulo: 'Comissão / Aluguel a Pagar',
      valor: formatBRL(d.valorDevidoPendente),
      sub: 'A repassar para a clínica',
      icon: Wallet,
      cor: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-950/30',
      tooltip: 'Total que você deve repassar à clínica: comissão percentual sobre consultas realizadas (COMISSIONADO) ou aluguel mensal da sala (LOCATÁRIO). Valores pendentes de todos os meses em aberto.',
    },
    {
      titulo: 'Pacientes ativos',
      valor: String(d.pacientesAtivos),
      sub: 'Consulta nos últimos 90 dias',
      icon: Users,
      cor: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    },
    {
      titulo: 'Pacientes inativos',
      valor: String(d.pacientesInativos),
      sub: `${d.pacientesTotal} total cadastrados`,
      icon: UserX,
      cor: 'text-slate-500',
      bg: 'bg-slate-50 dark:bg-slate-800/40',
    },
    {
      titulo: 'No-show este mês',
      valor: String(d.noShowMes),
      sub: 'Pacientes que faltaram',
      icon: AlertCircle,
      cor: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      titulo: 'Agendamentos futuros',
      valor: String(d.agendadosMes),
      sub: 'Confirmados e pendentes',
      icon: CalendarCheck,
      cor: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      titulo: 'Minhas despesas pendentes',
      valor: formatBRL(d.despesasPropriasTotal),
      sub: 'Despesas pessoais a pagar',
      icon: Receipt,
      cor: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meu Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Olá, {nome.split(' ')[0]}! Resumo do mês atual.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.titulo} className="shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-xs text-muted-foreground">{kpi.titulo}</p>
                      {kpi.tooltip && <InfoTooltip text={kpi.tooltip} />}
                    </div>
                    <p className={`text-2xl font-bold ${kpi.cor}`}>{kpi.valor}</p>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                  </div>
                  <div className={`rounded-lg p-2 shrink-0 ${kpi.bg}`}>
                    <Icon className={`h-5 w-5 ${kpi.cor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Consultas hoje */}
      <Card className="shadow-sm max-w-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Consultas Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {d.consultasHoje.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma consulta agendada para hoje.
            </p>
          ) : (
            <div className="space-y-3">
              {d.consultasHoje.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.paciente}</p>
                    <p className="text-xs text-muted-foreground">{a.sala}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold">
                      {format(parseISO(a.horario), 'HH:mm')}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${STATUS_COLORS[a.status] ?? ''}`}
                    >
                      {STATUS_LABELS[a.status] ?? a.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
