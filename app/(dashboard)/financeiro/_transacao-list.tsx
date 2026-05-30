// TransacaoList é async Server Component renderizado por 3 thin-wrappers
// (despesas/, receitas/, investimentos/page.tsx). React 19 RSC pipeline renderiza
// este componente em novo contexto async — ALS do parent não propaga. Resolve
// próprio tenant via getCurrentTenant() (mesmo padrão de TrialBanner e ProfissionalDashboard).
import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { startOfMonth, endOfMonth, parse, format, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'
import { getCurrentTenant } from '@/lib/tenant-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SearchInput } from '@/components/search-input'
import { TablePagination } from '@/components/table-pagination'
import { EmptyState } from '@/components/empty-state'
import { DeleteButton } from '@/components/delete-button'
import { deletarTransacao, marcarTransacaoPaga } from './actions'
import { getSearchParam, getPageParam, formatBRL } from '@/lib/utils'
import { MesFilter } from '@/components/financeiro/mes-filter'
import { PagarButton } from '@/components/financeiro/pagar-button'
import { DollarSign } from 'lucide-react'

const TIPO_LABELS = { RECEITA: 'Receitas', DESPESA: 'Despesas', INVESTIMENTO: 'Investimentos' }
const PER_PAGE = 20

interface Props {
  tipo: 'RECEITA' | 'DESPESA' | 'INVESTIMENTO'
  searchParams: Record<string, string | string[] | undefined>
}

export async function TransacaoList({ tipo, searchParams }: Props) {
  const q = getSearchParam(searchParams.q)
  const page = getPageParam(searchParams.page)
  const mesParam = getSearchParam(searchParams.mes) // 'YYYY-MM'
  const statusParam = getSearchParam(searchParams.status)
  const categoriaParam = getSearchParam(searchParams.categoria)

  let mesDate = new Date()
  if (mesParam) {
    const parsed = parse(mesParam, 'yyyy-MM', new Date())
    if (isValid(parsed)) mesDate = parsed
  }
  const inicio = startOfMonth(mesDate)
  const fim = endOfMonth(mesDate)

  const where: Record<string, unknown> = {
    tipo,
    data: { gte: inicio, lte: fim },
    ...(statusParam && statusParam !== 'todos' ? { status: statusParam } : {}),
    ...(categoriaParam ? { categoriaId: categoriaParam } : {}),
    ...(q ? { descricao: { contains: q, mode: 'insensitive' as const } } : {}),
  }

  const { id: tenantId } = await getCurrentTenant()
  const [transacoes, total, categorias, totalValor] = await runWithTenant(tenantId, async () => {
    const db = getTenantDb()
    return Promise.all([
      db.transacaoFinanceira.findMany({
        where,
        include: { categoria: { select: { nome: true, cor: true } } },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        orderBy: { data: 'desc' },
      }),
      db.transacaoFinanceira.count({ where }),
      db.categoriaFinanceira.findMany({ where: { tipo }, orderBy: { nome: 'asc' } }),
      db.transacaoFinanceira.aggregate({ where, _sum: { valor: true } }),
    ])
  })

  const titulo = TIPO_LABELS[tipo]
  const corValor = tipo === 'RECEITA' ? 'text-emerald-600' : tipo === 'DESPESA' ? 'text-red-500' : 'text-violet-600'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Total:{' '}
            <span className={`font-semibold ${corValor}`}>
              {formatBRL(Number(totalValor._sum.valor ?? 0))}
            </span>
            {' '}· {total} registro{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href={`/financeiro/transacoes/novo?tipo=${tipo}`}>
            <Plus className="h-4 w-4 mr-2" />
            Nova {tipo === 'RECEITA' ? 'Receita' : tipo === 'DESPESA' ? 'Despesa' : 'Investimento'}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Suspense><SearchInput placeholder={`Buscar em ${titulo.toLowerCase()}...`} /></Suspense>
        <Suspense><MesFilter /></Suspense>
      </div>

      {transacoes.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title={`Nenhuma ${titulo.toLowerCase()} encontrada`}
          description="Ajuste os filtros ou cadastre uma nova transação."
          action={<Button asChild><Link href={`/financeiro/transacoes/novo?tipo=${tipo}`}>Adicionar</Link></Button>}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Forma Pgto</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoes.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(t.data, 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{t.descricao}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.categoria.cor }} />
                      <span className="text-sm">{t.categoria.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.formaPagamento ?? '—'}</TableCell>
                  <TableCell className={`text-right font-semibold ${corValor}`}>
                    {formatBRL(Number(t.valor))}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={t.status === 'PAGO' ? 'outline' : 'secondary'}
                      className={t.status === 'PAGO' ? 'border-green-400 text-green-600' : 'text-amber-600'}
                    >
                      {t.status === 'PAGO' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {t.status === 'PENDENTE' && (
                        <PagarButton onPagar={marcarTransacaoPaga.bind(null, t.id)} label="Pagar" />
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/financeiro/transacoes/${t.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton
                        onDelete={deletarTransacao.bind(null, t.id)}
                        description={`Excluir "${t.descricao}"?`}
                      />
                    </div>
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
