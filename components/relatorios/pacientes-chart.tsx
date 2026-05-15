'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props { dados: { ativosRecentes: number; inativosLongos: number; inativos: number } }

export function PacientesChart({ dados }: Props) {
  const data = [
    { name: 'Consulta recente (90 dias)', value: dados.ativosRecentes, color: '#4f46e5' },
    { name: 'Sem consulta recente', value: dados.inativosLongos, color: '#f59e0b' },
    { name: 'Inativos (cadastro)', value: dados.inativos, color: '#94a3b8' },
  ].filter(d => d.value > 0)

  return (
    <Card className="max-w-lg shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Distribuição de Pacientes</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ percent }) => `${((percent ?? 0)*100).toFixed(0)}%`} labelLine={false}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
