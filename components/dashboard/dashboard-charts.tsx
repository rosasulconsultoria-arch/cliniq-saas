'use client'

import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Props {
  data: {
    faturamento12: { mes: string; receita: number; despesa: number }[]
    consultasPorProfissional: { nome: string; consultas: number; faturamento: number }[]
    ocupacaoDias: { dia: string; consultas: number }[]
    receitaOrigem: { nome: string; valor: number }[]
  }
}

const CORES = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

function fmt(v: number) {
  if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return `R$${v.toFixed(0)}`
}

export function DashboardCharts({ data }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Faturamento 12 meses */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Evolução do Faturamento</CardTitle>
          <CardDescription>Últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.faturamento12} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`} contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="despesa" name="Despesa" stroke="#f43f5e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Consultas por profissional */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Consultas por Profissional</CardTitle>
          <CardDescription>Período selecionado</CardDescription>
        </CardHeader>
        <CardContent>
          {data.consultasPorProfissional.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.consultasPorProfissional} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="nome" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip formatter={(v) => `${Number(v) || 0} consultas`} contentStyle={{ fontSize: 11 }} />
                <Bar dataKey="consultas" fill="#4f46e5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Ocupação das salas por dia */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Ocupação das Salas por Dia</CardTitle>
          <CardDescription>Consultas agendadas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.ocupacaoDias} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="ocupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="consultas" stroke="#4f46e5" strokeWidth={2} fill="url(#ocupGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Receitas por origem */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Receitas por Origem</CardTitle>
          <CardDescription>Online vs Interno</CardDescription>
        </CardHeader>
        <CardContent>
          {data.receitaOrigem.every(r => r.valor === 0) ? (
            <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.receitaOrigem} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {data.receitaOrigem.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `R$ ${(Number(v) || 0).toFixed(2).replace('.', ',')}`} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
