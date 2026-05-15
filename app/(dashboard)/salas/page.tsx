import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Pencil, DoorOpen } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SearchInput } from '@/components/search-input'
import { TablePagination } from '@/components/table-pagination'
import { EmptyState } from '@/components/empty-state'
import { DeleteButton } from '@/components/delete-button'
import { deletarSala } from './actions'
import { getSearchParam, getPageParam } from '@/lib/utils'

const PER_PAGE = 10

interface Props {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function SalasPage({ searchParams }: Props) {
  const q = getSearchParam(searchParams.q)
  const page = getPageParam(searchParams.page)

  const where = q ? { nome: { contains: q, mode: 'insensitive' as const } } : {}

  const inicio = startOfMonth(new Date())
  const fim = endOfMonth(new Date())

  const [dados, total] = await Promise.all([
    db.sala.findMany({
      where,
      include: {
        _count: {
          select: {
            agendamentos: {
              where: {
                dataHoraInicio: { gte: inicio, lte: fim },
                status: { notIn: ['CANCELADO', 'FALTOU'] },
              },
            },
          },
        },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { nome: 'asc' },
    }),
    db.sala.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Salas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie as salas da clínica</p>
        </div>
        <Button asChild>
          <Link href="/salas/novo">
            <Plus className="h-4 w-4 mr-2" />
            Nova Sala
          </Link>
        </Button>
      </div>

      <Suspense>
        <SearchInput placeholder="Buscar sala..." />
      </Suspense>

      {dados.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="Nenhuma sala encontrada"
          description={q ? `Nenhum resultado para "${q}"` : 'Cadastre a primeira sala para começar.'}
          action={!q ? <Button asChild><Link href="/salas/novo">Cadastrar Sala</Link></Button> : undefined}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Capacidade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Agend. no Mês</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.capacidade} {s.capacidade === 1 ? 'pessoa' : 'pessoas'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {s.descricao ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s._count.agendamentos}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={s.ativa ? 'outline' : 'destructive'}
                      className={s.ativa ? 'border-green-500 text-green-600 dark:text-green-400' : ''}
                    >
                      {s.ativa ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/salas/${s.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton
                        onDelete={deletarSala.bind(null, s.id)}
                        description={`Excluir a sala "${s.nome}"? Salas com agendamentos não podem ser excluídas.`}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Suspense>
            <TablePagination total={total} page={page} perPage={PER_PAGE} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
