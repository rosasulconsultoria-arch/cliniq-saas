import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Users } from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SearchInput } from '@/components/search-input'
import { TablePagination } from '@/components/table-pagination'
import { EmptyState } from '@/components/empty-state'
import { DeleteButton } from '@/components/delete-button'
import { deletarProfissional } from './actions'
import { getSearchParam, getPageParam } from '@/lib/utils'

const PER_PAGE = 10

interface Props {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function ProfissionaisPage({ searchParams }: Props) {
  const q = getSearchParam(searchParams.q)
  const page = getPageParam(searchParams.page)

  const where = q
    ? {
        OR: [
          { user: { name: { contains: q, mode: 'insensitive' as const } } },
          { especialidade: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [dados, total] = await Promise.all([
    db.profissional.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { user: { name: 'asc' } },
    }),
    db.profissional.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profissionais</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os profissionais da clínica</p>
        </div>
        <Button asChild>
          <Link href="/profissionais/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Profissional
          </Link>
        </Button>
      </div>

      <Suspense>
        <SearchInput placeholder="Buscar por nome ou especialidade..." />
      </Suspense>

      {dados.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum profissional encontrado"
          description={q ? `Nenhum resultado para "${q}"` : 'Cadastre o primeiro profissional para começar.'}
          action={!q ? <Button asChild><Link href="/profissionais/novo">Cadastrar Profissional</Link></Button> : undefined}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>CRP</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.user.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.user.email}</TableCell>
                  <TableCell>{p.especialidade}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.crp ?? '—'}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        p.tipoVinculo === 'COMISSIONADO'
                          ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300'
                      }
                    >
                      {p.tipoVinculo === 'COMISSIONADO' ? 'Comissionado' : 'Locatário'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.ativo ? 'outline' : 'destructive'}
                      className={p.ativo ? 'border-green-500 text-green-600 dark:text-green-400' : ''}
                    >
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/profissionais/${p.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton
                        onDelete={deletarProfissional.bind(null, p.id)}
                        description={`Excluir "${p.user.name}"? Esta ação não pode ser desfeita.`}
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
