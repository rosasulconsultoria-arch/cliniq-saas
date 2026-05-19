import { Suspense } from 'react'
import { getDRE } from '@/lib/relatorios'
import { periodoToRange } from '@/lib/periodo-utils'
import { PeriodoRelatorio } from '@/components/relatorios/periodo-relatorio'
import { ExportButtons } from '@/components/relatorios/export-buttons'
import { getSearchParam, formatBRL } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }

function DRERow({ label, valor, destaque = false, negativo = false }: {
  label: string; valor: number; destaque?: boolean; negativo?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between py-3 px-4', destaque && 'bg-muted/40 rounded-lg')}>
      <span className={cn('text-sm', destaque ? 'font-bold text-base' : 'text-muted-foreground')}>{label}</span>
      <span className={cn('font-semibold tabular-nums', negativo ? 'text-red-500' : valor >= 0 ? 'text-emerald-600' : 'text-red-500')}>
        {negativo ? `(${formatBRL(valor)})` : formatBRL(valor)}
      </span>
    </div>
  )
}

export default async function FinanceiroDREPage({ searchParams }: Props) {
  const sp = await searchParams
  const preset = getSearchParam(sp.periodo, 'mes_atual')
  const { inicio, fim } = periodoToRange(preset, getSearchParam(sp.de), getSearchParam(sp.ate))
  const d = await getDRE(inicio, fim)

  const csvHref = `/api/relatorios/csv?tipo=dre&inicio=${inicio}&fim=${fim}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">DRE — Demonstrativo de Resultado do Exercício</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Resultado financeiro do período selecionado</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Suspense><PeriodoRelatorio /></Suspense>
          <ExportButtons csvHref={csvHref} filename="dre" />
        </div>
      </div>

      <Card className="max-w-lg shadow-sm">
        <CardContent className="pt-4 divide-y">
          <DRERow label="(+) Receitas Operacionais" valor={d.receitas} />
          <DRERow label="(−) Despesas Operacionais" valor={d.despesas} negativo />
          <DRERow label="(+) Comissões Recebidas" valor={d.totalComissoes} />
          <DRERow label="(+) Receita de Aluguéis" valor={d.totalAlugueis} />
          <DRERow label="(−) Investimentos" valor={d.investimentos} negativo />
          <div className="pt-2 pb-1"><Separator /></div>
          <DRERow label="= Lucro Líquido" valor={d.lucro} destaque />
        </CardContent>
      </Card>
    </div>
  )
}
