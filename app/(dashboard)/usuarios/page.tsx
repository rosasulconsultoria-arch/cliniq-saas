import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Users } from 'lucide-react'
import { getTenantDb } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SearchInput } from '@/components/search-input'
import { TablePagination } from '@/components/table-pagination'
import { EmptyState } from '@/components/empty-state'
import { DeleteButton } from '@/components/delete-button'
import { RoleFilter } from './_role-filter'
import { deletarUsuario } from './actions'
import { getSearchParam, getPageParam } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PER_PAGE = 10

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  PROFISSIONAL: 'Profissional',
  RECEPCAO: 'Recepção',
}

interface Props {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function UsuariosPage({ searchParams }: Props) {
  const q = getSearchParam(searchParams.q)
  const page = getPageParam(searchParams.page)
  const roleFilter = getSearchParam(searchParams.role)

  const where = {
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { email: { contains: q, mode: 'insensitive' as const } }] } : {}),
    ...(roleFilter ? { role: roleFilter as any } : {}),
  }

  const db = getTenantDb()
  const [dados, total] = await Promise.all([
    db.user.findMany({
      where,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { name: 'asc' },
    }),
    db.user.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">Apenas administradores podem gerenciar usuários</p>
        </div>
        <Button asChild>
          <Link href="/usuarios/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Link>
        </Button>
      </div>

      <div className="flex gap-3">
        <Suspense>
          <SearchInput placeholder="Buscar por nome ou email..." />
        </Suspense>
        <Suspense>
          <RoleFilter />
        </Suspense>
      </div>

      {dados.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário encontrado"
          description={q || roleFilter ? 'Nenhum resultado para os filtros aplicados.' : 'Cadastre o primeiro usuário.'}
          action={!q && !roleFilter ? <Button asChild><Link href="/usuarios/novo">Cadastrar Usuário</Link></Button> : undefined}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Desde</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        u.role === 'ADMIN'
                          ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300'
                          : u.role === 'PROFISSIONAL'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300'
                      }
                    >
                      {ROLE_LABELS[u.role] ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.active ? 'outline' : 'destructive'}
                      className={u.active ? 'border-green-500 text-green-600 dark:text-green-400' : ''}
                    >
                      {u.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(u.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/usuarios/${u.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton
                        onDelete={deletarUsuario.bind(null, u.id)}
                        description={`Excluir o usuário "${u.name}"? Esta ação não pode ser desfeita.`}
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
