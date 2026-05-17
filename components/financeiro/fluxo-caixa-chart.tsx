'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Dia {
  data: string
  entradas: number
  saidas: number
  saldo: number
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v)
}

export function FluxoCaixaChart({ dados }: { dados: Dia[] }) {
  const chartData = dados.map(d => ({
    ...d,
    label: format(parseISO(d.data), 'dd/MM', { locale: ptBR }),
  }))

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolução do Caixa</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} width={72} />
            <Tooltip
              formatter={(value: number, name: string) => [
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                name === 'entradas' ? 'Entradas' : name === 'saidas' ? 'Saídas' : 'Saldo',
              ]}
              labelFormatter={(l) => `Dia: ${l}`}
            />
            <Legend formatter={(v) => v === 'entradas' ? 'Entradas' : v === 'saidas' ? 'Saídas' : 'Saldo Acumulado'} />
            <Bar dataKey="entradas" fill="#22c55e" opacity={0.85} radius={[3, 3, 0, 0]} />
            <Bar dataKey="saidas" fill="#ef4444" opacity={0.85} radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
