import { getPacientesAtivos } from '@/lib/relatorios'
import { runWithTenant } from '@/lib/tenant-context'
import { getCurrentTenant } from '@/lib/tenant-header'
import { ExportButtons } from '@/components/relatorios/export-buttons'
import { formatBRL } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { PacientesChart } from '@/components/relatorios/pacientes-chart'

export default async function RelatorioPacientesPage() {
  const { id: tenantId } = await getCurrentTenant()
  const d = await runWithTenant(tenantId, () => getPacientesAtivos())

  const cards = [
    { titulo: 'Total de Cadastros', valor: d.totalCadastros, cor: 'text-blue-600' },
    { titulo: 'Ativos', valor: d.ativos, cor: 'text-emerald-600' },
    { titulo: 'Inativos', valor: d.inativos, cor: 'text-slate-500' },
    { titulo: 'Ativos (últimos 90 dias)', valor: d.ativosRecentes, cor: 'text-indigo-600' },
    { titulo: 'Sem consulta recente', valor: d.inativosLongos, cor: 'text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Situação atual dos pacientes cadastrados</p>
        <ExportButtons csvHref="/api/relatorios/csv?tipo=pacientes" filename="pacientes" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(c => (
          <Card key={c.titulo} className="shadow-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{c.titulo}</p>
              <p className={`text-3xl font-bold mt-1 ${c.cor}`}>{c.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <PacientesChart dados={d} />
    </div>
  )
}
