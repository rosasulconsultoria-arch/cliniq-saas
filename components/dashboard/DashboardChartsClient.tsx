'use client'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

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

interface Props {
  data: {
    faturamento12: { mes: string; receita: number; despesa: number }[]
    consultasPorProfissional: { nome: string; consultas: number; faturamento: number }[]
    ocupacaoDias: { dia: string; consultas: number }[]
    receitaOrigem: { nome: string; valor: number }[]
  }
}

export function DashboardChartsClient({ data }: Props) {
  return <DashboardCharts data={data} />
}
