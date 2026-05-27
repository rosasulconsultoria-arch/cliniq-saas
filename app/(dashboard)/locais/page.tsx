import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Pencil, DoorOpen } from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { getTenantDb } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SearchInput } from '@/components/search-input'
import { TablePagination } from '@/components/table-pagination'
import { EmptyState } from '@/components/empty-state'
import { DeleteButton } from '@/components/delete-button'
import { deletarLocal } from './actions'
import { getSearchParam, getPageParam } from '@/lib/utils'
import { TIPO_LOCAL_LABELS, TIPO_LOCAL_ICONS } from '@/lib/schemas/local'

const PER_PAGE = 10

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LocaisPage(props: Props) {
  const searchParams = await props.searchParams;
  const q = getSearchParam(searchParams.q)
  const page = getPageParam(searchParams.page)

  const where = q ? { nome: { contains: q, mode: 'insensitive' as const } } : {}

  const inicio = startOfMonth(new Date())
  const fim = endOfMonth(new Date())

  const db = getTenantDb()
  const [dados, total] = await Promise.all([
    db.local.findMany({
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
    db.local.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Locais</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os locais de atendimento</p>
        </div>
        <Button asChild>
          <Link href="/locais/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Local
          </Link>
        </Button>
      </div>

      <Suspense>
        <SearchInput placeholder="Buscar local..." />
      </Suspense>

      {dados.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="Nenhum local encontrado"
          description={q ? `Nenhum resultado para "${q}"` : 'Cadastre o primeiro local para começar.'}
          action={!q ? <Button asChild><Link href="/locais/novo">Cadastrar Local</Link></Button> : undefined}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Agend. no Mês</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {TIPO_LOCAL_ICONS[s.tipo]} {TIPO_LOCAL_LABELS[s.tipo]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {s.endereco ?? s.linkPadrao ?? s.instrucoes ?? s.descricao ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s._count.agendamentos}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={s.ativa ? 'outline' : 'destructive'}
                      className={s.ativa ? 'border-green-500 text-green-600 dark:text-green-400' : ''}
                    >
                      {s.ativa ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/locais/${s.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton
                        onDelete={deletarLocal.bind(null, s.id)}
                        description={`Excluir o local "${s.nome}"? Locais com agendamentos não podem ser excluídos.`}
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
