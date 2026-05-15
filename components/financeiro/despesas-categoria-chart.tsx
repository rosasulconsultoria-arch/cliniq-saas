'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface DadosCategoria {
  nome: string
  cor: string
  total: number
}

interface Props {
  dados: DadosCategoria[]
}

export function DespesasCategoriaChart({ dados }: Props) {
  if (dados.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Despesas por Categoria</CardTitle>
          <CardDescription>Mês atual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
            Nenhuma despesa registrada neste mês
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Despesas por Categoria</CardTitle>
        <CardDescription>Mês atual (pagas)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={dados}
              dataKey="total"
              nameKey="nome"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {dados.map((entry, i) => (
                <Cell key={i} fill={entry.cor} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
