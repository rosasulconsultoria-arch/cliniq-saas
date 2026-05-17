import { Suspense } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TablePagination } from '@/components/table-pagination'
import { EmptyState } from '@/components/empty-state'
import { SearchInput } from '@/components/search-input'
import { ReceberPagamentoButton } from '@/components/financeiro/receber-pagamento-button'
import { formatBRL, getPageParam, getSearchParam } from '@/lib/utils'
import { DollarSign } from 'lucide-react'

const PER_PAGE = 20

interface Props {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function ComissoesPage({ searchParams }: Props) {
  const page = getPageParam(searchParams.page)
  const statusParam = getSearchParam(searchParams.status)
  const q = getSearchParam(searchParams.q)

  const where: Record<string, unknown> = {
    ...(statusParam && statusParam !== 'todos' ? { status: statusParam } : {}),
  }

  const [comissoes, total, pendentesTotal] = await Promise.all([
    db.comissao.findMany({
      where,
      include: {
        profissional: { include: { user: { select: { name: true } } } },
        agendamento: { select: { dataHoraInicio: true, paciente: { select: { nome: true } } } },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { agendamento: { dataHoraInicio: 'desc' } },
    }),
    db.comissao.count({ where }),
    db.comissao.aggregate({ where: { status: 'PENDENTE' }, _sum: { valorComissao: true } }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Comissões pendentes:{' '}
            <span className="font-semibold text-amber-600">
              {formatBRL(Number(pendentesTotal._sum.valorComissao ?? 0))}
            </span>
          </p>
        </div>
        <Suspense><SearchInput placeholder="Buscar profissional..." /></Suspense>
      </div>

      {comissoes.length === 0 ? (
        <EmptyState icon={DollarSign} title="Nenhuma comissão encontrada" description="As comissões são geradas automaticamente ao marcar consultas como realizadas." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor Bruto</TableHead>
                <TableHead className="text-right">% Comissão</TableHead>
                <TableHead className="text-right">Valor Comissão</TableHead>
                <TableHead className="text-right">Valor Clínica</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comissoes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.profissional.user.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.agendamento.paciente.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(c.agendamento.dataHoraInicio, 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">{formatBRL(Number(c.valorBruto))}</TableCell>
                  <TableCell className="text-right">{Number(c.percentual).toFixed(0)}%</TableCell>
                  <TableCell className="text-right text-amber-600 font-semibold">{formatBRL(Number(c.valorComissao))}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-semibold">{formatBRL(Number(c.valorClinica))}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'PAGO' ? 'outline' : 'secondary'} className={c.status === 'PAGO' ? 'border-green-400 text-green-600' : 'text-amber-600'}>
                      {c.status === 'PAGO' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.status === 'PENDENTE' && (
                      <ReceberPagamentoButton
                        id={c.id}
                        tipo="comissao"
                        descricao={`Comissão — ${c.profissional.user.name}`}
                        valor={formatBRL(Number(c.valorComissao))}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Suspense><TablePagination total={total} page={page} perPage={PER_PAGE} /></Suspense>
        </div>
      )}
    </div>
  )
}
