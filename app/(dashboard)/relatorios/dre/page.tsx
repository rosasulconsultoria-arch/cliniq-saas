import { Suspense } from 'react'
import { getDRE } from '@/lib/relatorios'
import { periodoToRange, PeriodoRelatorio } from '@/components/relatorios/periodo-relatorio'
import { ExportButtons } from '@/components/relatorios/export-buttons'
import { getSearchParam, formatBRL } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface Props { searchParams: Record<string, string | string[] | undefined> }

function DRERow({ label, valor, destaque = false, negativo = false, subtotal = false }: { label: string; valor: number; destaque?: boolean; negativo?: boolean; subtotal?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between py-3 px-4', subtotal && 'bg-muted/40 rounded-lg', destaque && 'font-bold text-base')}>
      <span className={cn('text-sm', destaque ? 'font-bold' : subtotal ? 'font-semibold' : 'text-muted-foreground')}>{label}</span>
      <span className={cn('font-semibold tabular-nums', negativo ? 'text-red-500' : valor >= 0 ? 'text-emerald-600' : 'text-red-500')}>
        {negativo ? `(${formatBRL(valor)})` : formatBRL(valor)}
      </span>
    </div>
  )
}

export default async function RelatorioDREPage({ searchParams }: Props) {
  const preset = getSearchParam(searchParams.periodo, 'mes_atual')
  const { inicio, fim } = periodoToRange(preset, getSearchParam(searchParams.de), getSearchParam(searchParams.ate))
  const d = await getDRE(inicio, fim)

  async function csvAction() {
    'use server'
    const { getDRE: get } = await import('@/lib/relatorios')
    const r = await get(inicio, fim)
    return [
      'Item,Valor',
      `Receitas,${r.receitas.toFixed(2)}`,
      `Despesas Operacionais,-${r.despesas.toFixed(2)}`,
      `Comissões Pagas,-${r.totalComissoes.toFixed(2)}`,
      `Receita de Aluguéis,${r.totalAlugueis.toFixed(2)}`,
      `Investimentos,-${r.investimentos.toFixed(2)}`,
      `Lucro Líquido,${r.lucro.toFixed(2)}`,
    ].join('\n')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">DRE Simplificado — Demonstrativo de Resultado</p>
        <div className="flex gap-2">
          <Suspense><PeriodoRelatorio /></Suspense>
          <ExportButtons onExportCSV={csvAction} filename="dre" />
        </div>
      </div>

      <Card className="max-w-lg shadow-sm">
        <CardContent className="pt-4 divide-y">
          <DRERow label="(+) Receitas Operacionais" valor={d.receitas} />
          <DRERow label="(−) Despesas Operacionais" valor={d.despesas} negativo />
          <DRERow label="(−) Comissões Pagas" valor={d.totalComissoes} negativo />
          <DRERow label="(+) Receita de Aluguéis" valor={d.totalAlugueis} />
          <DRERow label="(−) Investimentos" valor={d.investimentos} negativo />
          <div className="pt-2 pb-1"><Separator /></div>
          <DRERow label="= Lucro Líquido" valor={d.lucro} destaque />
        </CardContent>
      </Card>
    </div>
  )
}
