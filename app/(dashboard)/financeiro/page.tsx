import { startOfMonth, endOfMonth, subMonths, format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getTenantDb } from '@/lib/prisma'
import { KPICards } from '@/components/financeiro/kpi-cards'
import { ReceitasDespesasChart } from '@/components/financeiro/receitas-despesas-chart'
import { DespesasCategoriaChart } from '@/components/financeiro/despesas-categoria-chart'
import { PeriodoFilterFinanceiro } from '@/components/financeiro/periodo-filter-financeiro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/utils'

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getPeriodo(p: string | undefined) {
  const hoje = new Date()
  const fim = endOfMonth(hoje)
  switch (p) {
    case '3m':  return { inicio: startOfMonth(subMonths(hoje, 2)), fim, meses: 3,  label: 'Últimos 3 meses' }
    case '6m':  return { inicio: startOfMonth(subMonths(hoje, 5)), fim, meses: 6,  label: 'Últimos 6 meses' }
    case '12m': return { inicio: startOfMonth(subMonths(hoje, 11)), fim, meses: 12, label: 'Últimos 12 meses' }
    default:    return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje), meses: 1, label: 'Mês atual' }
  }
}

export default async function FinanceiroPage({ searchParams }: Props) {
  const sp = await searchParams
  const periodoParam = typeof sp.periodo === 'string' ? sp.periodo : 'mes'
  const { inicio, fim, meses, label } = getPeriodo(periodoParam)
  const hoje = new Date()
  const db = getTenantDb()

  // KPIs + breakdown por origem
  const [receita, despesa, investimento, comissoesPend, alugueisPend, todasReceitas] = await Promise.all([
    db.transacaoFinanceira.aggregate({ where: { tipo: 'RECEITA', data: { gte: inicio, lte: fim }, status: 'PAGO' }, _sum: { valor: true } }),
    db.transacaoFinanceira.aggregate({ where: { tipo: 'DESPESA', data: { gte: inicio, lte: fim }, status: 'PAGO' }, _sum: { valor: true } }),
    db.transacaoFinanceira.aggregate({ where: { tipo: 'INVESTIMENTO', data: { gte: inicio, lte: fim }, status: 'PAGO' }, _sum: { valor: true } }),
    db.comissao.aggregate({ where: { status: 'PENDENTE', agendamento: { dataHoraInicio: { gte: inicio, lte: fim } } }, _sum: { valorComissao: true } }),
    db.aluguel.aggregate({ where: { status: 'PENDENTE', mesReferencia: { gte: inicio, lte: fim } }, _sum: { valor: true } }),
    db.transacaoFinanceira.findMany({
      where: { tipo: 'RECEITA', data: { gte: inicio, lte: fim }, status: 'PAGO' },
      select: { descricao: true, valor: true },
    }),
  ])

  const origemConsultas = todasReceitas.filter(r => r.descricao.startsWith('Receita de consulta')).reduce((s, r) => s + Number(r.valor), 0)
  const origemAlugueis  = todasReceitas.filter(r => r.descricao.startsWith('Aluguel de sala')).reduce((s, r) => s + Number(r.valor), 0)
  const origemOutras    = todasReceitas.filter(r => !r.descricao.startsWith('Receita de consulta') && !r.descricao.startsWith('Aluguel de sala')).reduce((s, r) => s + Number(r.valor), 0)

  const receitaMes      = Number(receita._sum.valor ?? 0)
  const despesaMes      = Number(despesa._sum.valor ?? 0)
  const investimentosMes = Number(investimento._sum.valor ?? 0)

  // Gráfico mensal — adapta ao período selecionado
  const mesesList = Array.from({ length: meses }, (_, i) => subMonths(hoje, meses - 1 - i))
  const dadosMensais = await Promise.all(
    mesesList.map(async (mes) => {
      const ini = startOfMonth(mes)
      const fi  = endOfMonth(mes)
      const [r, d] = await Promise.all([
        db.transacaoFinanceira.aggregate({ where: { tipo: 'RECEITA',  data: { gte: ini, lte: fi }, status: 'PAGO' }, _sum: { valor: true } }),
        db.transacaoFinanceira.aggregate({ where: { tipo: 'DESPESA',  data: { gte: ini, lte: fi }, status: 'PAGO' }, _sum: { valor: true } }),
      ])
      return {
        mes: format(mes, 'MMM', { locale: ptBR }),
        receita: Number(r._sum.valor ?? 0),
        despesa: Number(d._sum.valor ?? 0),
      }
    })
  )

  // Despesas por categoria (período selecionado)
  const despesasBruto = await db.transacaoFinanceira.findMany({
    where: { tipo: 'DESPESA', data: { gte: inicio, lte: fim }, status: 'PAGO' },
    select: { valor: true, categoriaId: true, categoria: { select: { nome: true, cor: true } } },
  })
  const porCategoria = Object.values(
    despesasBruto.reduce<Record<string, { nome: string; cor: string; total: number }>>((acc, t) => {
      const k = t.categoriaId
      if (!acc[k]) acc[k] = { nome: t.categoria.nome, cor: t.categoria.cor, total: 0 }
      acc[k].total += Number(t.valor)
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total)

  // Próximos vencimentos (sempre próximos 7 dias, independente do filtro)
  const em7Dias = addDays(hoje, 7)
  const vencimentos = await db.transacaoFinanceira.findMany({
    where: { status: 'PENDENTE', data: { gte: hoje, lte: em7Dias } },
    include: { categoria: { select: { nome: true, cor: true } } },
    orderBy: { data: 'asc' },
    take: 8,
  })

  return (
    <div className="space-y-6">
      {/* Header com filtro */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Visão Geral</h2>
          <p className="text-sm text-muted-foreground capitalize">{label}</p>
        </div>
        <PeriodoFilterFinanceiro value={periodoParam} />
      </div>

      <KPICards
        receitaMes={receitaMes}
        despesaMes={despesaMes}
        investimentosMes={investimentosMes}
        lucroLiquido={receitaMes - despesaMes}
        comissoesPendentes={Number(comissoesPend._sum.valorComissao ?? 0)}
        alugueisPendentes={Number(alugueisPend._sum.valor ?? 0)}
        periodoLabel={label}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReceitasDespesasChart dados={dadosMensais} />
        <DespesasCategoriaChart dados={porCategoria} />
      </div>

      {/* Receitas por origem */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Receitas por Origem — {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Consultas (comissão clínica)', valor: origemConsultas, cor: 'bg-indigo-500' },
              { label: 'Aluguéis de sala',             valor: origemAlugueis,  cor: 'bg-emerald-500' },
              { label: 'Outras receitas',              valor: origemOutras,    cor: 'bg-blue-500' },
            ].map(item => {
              const total = receitaMes || 1
              const pct = Math.round((item.valor / total) * 100)
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.cor}`} />
                      {item.label}
                    </span>
                    <span className="font-semibold">{formatBRL(item.valor)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${item.cor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Próximos vencimentos */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Próximos Vencimentos</CardTitle>
        </CardHeader>
        <CardContent>
          {vencimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum vencimento nos próximos 7 dias.
            </p>
          ) : (
            <div className="space-y-2">
              {vencimentos.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.categoria.cor }} />
                    <div>
                      <p className="text-sm font-medium">{t.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(t.data, 'dd/MM/yyyy', { locale: ptBR })} · {t.categoria.nome}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={t.tipo === 'RECEITA' ? 'outline' : 'destructive'}
                    className={t.tipo === 'RECEITA' ? 'border-emerald-400 text-emerald-600' : ''}
                  >
                    {t.tipo === 'RECEITA' ? '+' : '-'}{formatBRL(Number(t.valor))}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
