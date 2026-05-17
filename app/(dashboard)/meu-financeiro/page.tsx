import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Lock } from 'lucide-react'
import { formatBRL } from '@/lib/utils'
import { DeleteDespesaButton } from '@/components/meu-financeiro/delete-button'
import { MarcarPagoButton } from '@/components/meu-financeiro/marcar-pago-button'

export default async function MeuFinanceiroPage() {
  const session = await auth()
  if (session?.user?.role !== 'PROFISSIONAL') redirect('/dashboard')

  const profissional = await db.profissional.findUnique({
    where: { userId: session.user.id! },
  })
  if (!profissional) redirect('/dashboard')

  // Auto-gerar aluguel do mês atual para LOCATARIO
  if (profissional.tipoVinculo === 'LOCATARIO' && profissional.valorAluguelMensal) {
    const mesAtual = startOfMonth(new Date())
    const aluguelExiste = await db.aluguel.findFirst({
      where: { profissionalId: profissional.id, mesReferencia: mesAtual },
    })
    if (!aluguelExiste) {
      await db.aluguel.create({
        data: {
          profissionalId: profissional.id,
          mesReferencia: mesAtual,
          valor: profissional.valorAluguelMensal,
          status: 'PENDENTE',
        },
      })
    }
  }

  const [despesasPessoais, alugueis, comissoes] = await Promise.all([
    db.despesaProfissional.findMany({
      where: { profissionalId: profissional.id },
      orderBy: { data: 'desc' },
    }),
    profissional.tipoVinculo === 'LOCATARIO'
      ? db.aluguel.findMany({
          where: { profissionalId: profissional.id },
          orderBy: { mesReferencia: 'desc' },
        })
      : Promise.resolve([]),
    profissional.tipoVinculo === 'COMISSIONADO'
      ? db.comissao.findMany({
          where: { profissionalId: profissional.id },
          include: { agendamento: { select: { dataHoraInicio: true, valor: true } } },
          orderBy: { agendamento: { dataHoraInicio: 'desc' } },
        })
      : Promise.resolve([]),
  ])

  // Totais combinados
  const totalPendente =
    despesasPessoais.filter(d => d.status === 'PENDENTE').reduce((s, d) => s + Number(d.valor), 0) +
    alugueis.filter(a => a.status === 'PENDENTE').reduce((s, a) => s + Number(a.valor), 0) +
    comissoes.filter(c => c.status === 'PENDENTE').reduce((s, c) => s + Number(c.valorComissao), 0)

  const totalPago =
    despesasPessoais.filter(d => d.status === 'PAGO').reduce((s, d) => s + Number(d.valor), 0) +
    alugueis.filter(a => a.status === 'PAGO').reduce((s, a) => s + Number(a.valor), 0) +
    comissoes.filter(c => c.status === 'PAGO').reduce((s, c) => s + Number(c.valorComissao), 0)

  const statusBadge = (status: string) => (
    <Badge variant="outline" className={status === 'PAGO' ? 'border-green-400 text-green-600' : 'border-amber-400 text-amber-600'}>
      {status === 'PAGO' ? 'Pago' : 'Pendente'}
    </Badge>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Minhas Despesas</h1>
          <p className="text-sm text-muted-foreground mt-1">Despesas pessoais e obrigações com a clínica</p>
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
            <p className="text-xs text-muted-foreground">Total pendente</p>
            <p className="text-xl font-bold text-amber-600">{formatBRL(totalPendente)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total pago</p>
            <p className="text-xl font-bold text-emerald-600">{formatBRL(totalPago)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Aluguel mensal (LOCATARIO) */}
      {alugueis.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" /> Aluguel da Clínica
          </h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês de Referência</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {alugueis.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(a.mesReferencia), 'MMMM yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-red-500">{formatBRL(Number(a.valor))}</TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(a as any).formaPagamento ?? '—'}</TableCell>
                    <TableCell>
                      {a.status === 'PENDENTE' && (
                        <MarcarPagoButton
                          id={a.id}
                          tipo="aluguel"
                          descricao={`Aluguel — ${format(new Date(a.mesReferencia), 'MMMM yyyy', { locale: ptBR })} — ${formatBRL(Number(a.valor))}`}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Comissões (COMISSIONADO) */}
      {comissoes.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" /> Comissões da Clínica
          </h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data da Consulta</TableHead>
                  <TableHead>Valor Bruto</TableHead>
                  <TableHead className="text-right">Comissão ({Number(profissional.comissaoPercentual)}%)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(c.agendamento.dataHoraInicio), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatBRL(Number(c.valorBruto))}</TableCell>
                    <TableCell className="text-right font-semibold text-red-500">{formatBRL(Number(c.valorComissao))}</TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{(c as any).formaPagamento ?? '—'}</TableCell>
                    <TableCell>
                      {c.status === 'PENDENTE' && (
                        <MarcarPagoButton
                          id={c.id}
                          tipo="comissao"
                          descricao={`Comissão consulta ${format(new Date(c.agendamento.dataHoraInicio), 'dd/MM/yyyy')} — ${formatBRL(Number(c.valorComissao))}`}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Despesas pessoais */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Despesas Pessoais</h2>
        {despesasPessoais.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border rounded-lg">
            <p className="text-sm">Nenhuma despesa pessoal registrada.</p>
            <Button variant="outline" className="mt-3" asChild>
              <Link href="/meu-financeiro/nova">Registrar despesa</Link>
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
                  <TableHead>Pagamento</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesasPessoais.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(d.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{d.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.categoria}</TableCell>
                    <TableCell className="text-right font-semibold text-red-500">{formatBRL(Number(d.valor))}</TableCell>
                    <TableCell>{statusBadge(d.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.formaPagamento ?? '—'}</TableCell>
                    <TableCell className="flex gap-1">
                      {d.status === 'PENDENTE' && (
                        <MarcarPagoButton
                          id={d.id}
                          tipo="despesa"
                          descricao={`${d.descricao} — ${formatBRL(Number(d.valor))}`}
                        />
                      )}
                      <DeleteDespesaButton id={d.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
