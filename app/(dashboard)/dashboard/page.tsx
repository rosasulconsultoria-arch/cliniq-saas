import { Suspense } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getDashboardKPIs, getDashboardCharts, getDashboardListas, getPeriodDates } from '@/lib/dashboard'
import { getSearchParam } from '@/lib/utils'
import { KPISection } from '@/components/dashboard/kpi-section'
import dynamic from 'next/dynamic'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { Skeleton } from '@/components/ui/skeleton'
import { auth } from '@/lib/auth'
import { getTenantDb } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant-context'
import { ProfissionalDashboard } from '@/components/dashboard/profissional-dashboard'

const DashboardCharts = dynamic(
  () => import('@/components/dashboard/dashboard-charts').then(m => ({ default: m.DashboardCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px] rounded-lg" />
        ))}
      </div>
    ),
  }
)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/utils'
import { Tag } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'

interface Props {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth()
  const db = getTenantDb()
  const tenantId = getTenantId()

  if (session?.user?.role === 'PROFISSIONAL') {
    const profissional = await db.profissional.findUnique({
      where: { userId: session.user.id! },
      include: { user: { select: { name: true } } },
    })
    if (profissional) {
      return <ProfissionalDashboard profissionalId={profissional.id} nome={profissional.user.name} />
    }
  }

  const periodo = getSearchParam(searchParams.periodo, 'mes_atual')
  const de = getSearchParam(searchParams.de)
  const ate = getSearchParam(searchParams.ate)
  const { inicio, fim, inicioAnterior, fimAnterior, label } = getPeriodDates(periodo, de, ate)

  const [kpis, charts, listas, topServicos] = await Promise.all([
    getDashboardKPIs(inicio.toISOString(), fim.toISOString(), inicioAnterior.toISOString(), fimAnterior.toISOString()),
    getDashboardCharts(inicio.toISOString(), fim.toISOString()),
    getDashboardListas(),
    // AgendamentoServico é SKIP_TENANT — Padrão 2: filtrar via agendamento.tenantId
    db.agendamentoServico.findMany({
      where: {
        agendamento: { dataHoraInicio: { gte: inicio, lte: fim }, status: { notIn: ['CANCELADO'] }, tenantId },
      },
      include: { servico: { select: { nome: true } } },
    }).then(rows => {
      const counts: Record<string, { nome: string; count: number }> = {}
      for (const r of rows) {
        const k = r.servicoId
        counts[k] = counts[k] ?? { nome: r.servico.nome, count: 0 }
        counts[k].count++
      }
      return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5)
    }),
  ])

  const STATUS_COLORS: Record<string, string> = {
    AGENDADO: 'border-blue-400 text-blue-600',
    CONFIRMADO: 'border-green-400 text-green-600',
    REALIZADO: 'text-slate-500',
    FALTOU: 'border-amber-400 text-amber-600',
  }
  const STATUS_LABELS: Record<string, string> = { AGENDADO: 'Agendado', CONFIRMADO: 'Confirmado', REALIZADO: 'Realizado', FALTOU: 'Faltou' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{label}</p>
        </div>
        <Suspense><PeriodFilter /></Suspense>
      </div>

      {/* KPIs */}
      <KPISection kpis={kpis} />

      {/* Charts */}
      <DashboardCharts data={charts} />

      {/* Bottom lists */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* Consultas de hoje */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Consultas Hoje</CardTitle>
              <InfoTooltip text="Agendamentos do dia atual com status Agendado, Confirmado, Realizado ou Faltou. Não inclui cancelamentos." />
            </div>
          </CardHeader>
          <CardContent>
            {listas.consultasHoje.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma consulta hoje.</p>
            ) : (
              <div className="space-y-3">
                {listas.consultasHoje.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.paciente}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.profissional} · {a.sala}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold">{format(parseISO(a.horario), 'HH:mm')}</p>
                      <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[a.status] ?? ''}`}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top profissionais */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Top Profissionais</CardTitle>
              <InfoTooltip text="Profissionais com maior faturamento no período selecionado, ordenados por receita gerada nas consultas realizadas." />
            </div>
          </CardHeader>
          <CardContent>
            {listas.topProfissionais.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados no período.</p>
            ) : (
              <div className="space-y-3">
                {listas.topProfissionais.map((p, i) => (
                  <div key={p.nome} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.consultas} consultas</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 shrink-0">{formatBRL(p.faturamento)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Serviços */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-500" />
                Top Serviços
              </CardTitle>
              <InfoTooltip text="Serviços mais vinculados aos agendamentos no período. Conta apenas agendamentos não cancelados." />
            </div>
          </CardHeader>
          <CardContent>
            {topServicos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum serviço no período.</p>
            ) : (
              <div className="space-y-3">
                {topServicos.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <p className="text-sm font-medium truncate">{s.nome}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 tabular-nums">{s.count}×</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas transações */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Últimas Transações</CardTitle>
              <InfoTooltip text="As 5 transações financeiras mais recentes (receitas e despesas) cadastradas no sistema, independente do período filtrado." />
            </div>
          </CardHeader>
          <CardContent>
            {listas.ultimasTransacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação.</p>
            ) : (
              <div className="space-y-3">
                {listas.ultimasTransacoes.map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2 w-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: t.categoriaCor }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.descricao}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(t.data), 'dd/MM', { locale: ptBR })}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${t.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {t.tipo === 'RECEITA' ? '+' : '−'}{formatBRL(t.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
