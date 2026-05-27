import { Suspense } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getTenantDb } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TablePagination } from '@/components/table-pagination'
import { EmptyState } from '@/components/empty-state'
import { GerarAlugueisButton } from '@/components/financeiro/gerar-alugueis-button'
import { ReceberPagamentoButton } from '@/components/financeiro/receber-pagamento-button'
import { formatBRL, getPageParam, getSearchParam } from '@/lib/utils'
import { Home } from 'lucide-react'

const PER_PAGE = 20

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AlugueisPage(props: Props) {
  const searchParams = await props.searchParams;
  const page = getPageParam(searchParams.page)
  const statusParam = getSearchParam(searchParams.status)

  const where: Record<string, unknown> = {
    ...(statusParam && statusParam !== 'todos' ? { status: statusParam } : {}),
  }

  const db = getTenantDb()
  const [alugueis, total, pendentesTotal] = await Promise.all([
    db.aluguel.findMany({
      where,
      include: { profissional: { include: { user: { select: { name: true } } } } },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { mesReferencia: 'desc' },
    }),
    db.aluguel.count({ where }),
    db.aluguel.aggregate({ where: { status: 'PENDENTE' }, _sum: { valor: true } }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          Aluguéis pendentes:{' '}
          <span className="font-semibold text-blue-600">
            {formatBRL(Number(pendentesTotal._sum.valor ?? 0))}
          </span>
        </p>
        <GerarAlugueisButton />
      </div>

      {alugueis.length === 0 ? (
        <EmptyState
          icon={Home}
          title="Nenhum aluguel encontrado"
          description="Use o botão 'Gerar Aluguéis do Mês' para criar registros para os profissionais locatários."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Mês de Referência</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Pagamento</TableHead>
                <TableHead className="w-20 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alugueis.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.profissional.user.name}</TableCell>
                  <TableCell className="capitalize text-sm text-muted-foreground">
                    {format(a.mesReferencia, "MMMM 'de' yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-blue-600">{formatBRL(Number(a.valor))}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === 'PAGO' ? 'outline' : 'secondary'} className={a.status === 'PAGO' ? 'border-green-400 text-green-600' : 'text-amber-600'}>
                      {a.status === 'PAGO' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.dataPagamento ? format(a.dataPagamento, 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {a.status === 'PENDENTE' && (
                      <ReceberPagamentoButton
                        id={a.id}
                        tipo="aluguel"
                        descricao={`Aluguel — ${a.profissional.user.name} · ${format(a.mesReferencia, "MMM/yyyy", { locale: ptBR })}`}
                        valor={formatBRL(Number(a.valor))}
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
