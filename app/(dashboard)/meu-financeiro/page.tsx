import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2 } from 'lucide-react'
import { formatBRL } from '@/lib/utils'
import { DeleteDespesaButton } from '@/components/meu-financeiro/delete-button'

export default async function MeuFinanceiroPage() {
  const session = await auth()
  if (session?.user?.role !== 'PROFISSIONAL') redirect('/dashboard')

  const profissional = await db.profissional.findUnique({
    where: { userId: session.user.id! },
  })
  if (!profissional) redirect('/dashboard')

  const despesas = await db.despesaProfissional.findMany({
    where: { profissionalId: profissional.id },
    orderBy: { data: 'desc' },
  })

  const totalPago = despesas.filter(d => d.status === 'PAGO').reduce((s, d) => s + Number(d.valor), 0)
  const totalPendente = despesas.filter(d => d.status === 'PENDENTE').reduce((s, d) => s + Number(d.valor), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minhas Despesas</h1>
          <p className="text-sm text-muted-foreground mt-1">Despesas pessoais — não impactam as finanças da clínica</p>
        </div>
        <Button asChild>
          <Link href="/meu-financeiro/nova">
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Link>
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 max-w-md">
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total pago</p>
            <p className="text-xl font-bold text-red-500">{formatBRL(totalPago)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total pendente</p>
            <p className="text-xl font-bold text-amber-600">{formatBRL(totalPendente)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      {despesas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhuma despesa registrada.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/meu-financeiro/nova">Registrar primeira despesa</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(d.data), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{d.descricao}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.categoria}</TableCell>
                  <TableCell className="text-right font-semibold text-red-500">{formatBRL(Number(d.valor))}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={d.status === 'PAGO'
                        ? 'border-green-400 text-green-600'
                        : 'border-amber-400 text-amber-600'}
                    >
                      {d.status === 'PAGO' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DeleteDespesaButton id={d.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
