import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db } from '@/lib/db'
import { KPICards } from '@/components/financeiro/kpi-cards'
import { ReceitasDespesasChart } from '@/components/financeiro/receitas-despesas-chart'
import { DespesasCategoriaChart } from '@/components/financeiro/despesas-categoria-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/utils'
import { addDays } from 'date-fns'

export default async function FinanceiroPage() {
  const hoje = new Date()
  const inicio = startOfMonth(hoje)
  const fim = endOfMonth(hoje)

  // KPIs
  const [receita, despesa, investimento, comissoesPend, alugueisPend] = await Promise.all([
    db.transacaoFinanceira.aggregate({ where: { tipo: 'RECEITA', data: { gte: inicio, lte: fim }, status: 'PAGO' }, _sum: { valor: true } }),
    db.transacaoFinanceira.aggregate({ where: { tipo: 'DESPESA', data: { gte: inicio, lte: fim }, status: 'PAGO' }, _sum: { valor: true } }),
    db.transacaoFinanceira.aggregate({ where: { tipo: 'INVESTIMENTO', data: { gte: inicio, lte: fim }, status: 'PAGO' }, _sum: { valor: true } }),
    db.comissao.aggregate({ where: { status: 'PENDENTE' }, _sum: { valorComissao: true } }),
    db.aluguel.aggregate({ where: { status: 'PENDENTE' }, _sum: { valor: true } }),
  ])

  const receitaMes = Number(receita._sum.valor ?? 0)
  const despesaMes = Number(despesa._sum.valor ?? 0)
  const investimentosMes = Number(investimento._sum.valor ?? 0)

  // Gráfico últimos 6 meses
  const meses = Array.from({ length: 6 }, (_, i) => subMonths(hoje, 5 - i))
  const dadosMensais = await Promise.all(
    meses.map(async (mes) => {
      const ini = startOfMonth(mes)
      const fi = endOfMonth(mes)
      const [r, d] = await Promise.all([
        db.transacaoFinanceira.aggregate({ where: { tipo: 'RECEITA', data: { gte: ini, lte: fi }, status: 'PAGO' }, _sum: { valor: true } }),
        db.transacaoFinanceira.aggregate({ where: { tipo: 'DESPESA', data: { gte: ini, lte: fi }, status: 'PAGO' }, _sum: { valor: true } }),
      ])
      return {
        mes: format(mes, 'MMM', { locale: ptBR }),
        receita: Number(r._sum.valor ?? 0),
        despesa: Number(d._sum.valor ?? 0),
      }
    })
  )

  // Pizza: despesas por categoria do mês atual
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

  // Próximos vencimentos (próximos 7 dias)
  const em7Dias = addDays(hoje, 7)
  const vencimentos = await db.transacaoFinanceira.findMany({
    where: { status: 'PENDENTE', data: { gte: hoje, lte: em7Dias } },
    include: { categoria: { select: { nome: true, cor: true } } },
    orderBy: { data: 'asc' },
    take: 8,
  })

  return (
    <div className="space-y-6">
      <KPICards
        receitaMes={receitaMes}
        despesaMes={despesaMes}
        investimentosMes={investimentosMes}
        lucroLiquido={receitaMes - despesaMes}
        comissoesPendentes={Number(comissoesPend._sum.valorComissao ?? 0)}
        alugueisPendentes={Number(alugueisPend._sum.valor ?? 0)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ReceitasDespesasChart dados={dadosMensais} />
        <DespesasCategoriaChart dados={porCategoria} />
      </div>

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
                        {format(t.data, "dd/MM/yyyy", { locale: ptBR })} · {t.categoria.nome}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.tipo === 'RECEITA' ? 'outline' : 'destructive'} className={t.tipo === 'RECEITA' ? 'border-emerald-400 text-emerald-600' : ''}>
                      {t.tipo === 'RECEITA' ? '+' : '-'}{formatBRL(Number(t.valor))}
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
