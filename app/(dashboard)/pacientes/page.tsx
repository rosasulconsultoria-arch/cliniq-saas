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
import { deletarPaciente } from './actions'
import { getSearchParam, getPageParam, formatarCPF, calcularIdade } from '@/lib/utils'

const PER_PAGE = 10

interface Props {
  searchParams: Record<string, string | string[] | undefined>
}

export default async function PacientesPage({ searchParams }: Props) {
  const q = getSearchParam(searchParams.q)
  const page = getPageParam(searchParams.page)

  const where = q
    ? {
        OR: [
          { nome: { contains: q, mode: 'insensitive' as const } },
          { cpf: { contains: q.replace(/\D/g, '') } },
        ],
      }
    : {}

  const [dados, total] = await Promise.all([
    db.paciente.findMany({
      where,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { nome: 'asc' },
    }),
    db.paciente.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie os pacientes da clínica</p>
        </div>
        <Button asChild>
          <Link href="/pacientes/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Paciente
          </Link>
        </Button>
      </div>

      <Suspense>
        <SearchInput placeholder="Buscar por nome ou CPF..." />
      </Suspense>

      {dados.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum paciente encontrado"
          description={q ? `Nenhum resultado para "${q}"` : 'Cadastre o primeiro paciente para começar.'}
          action={!q ? <Button asChild><Link href="/pacientes/novo">Cadastrar Paciente</Link></Button> : undefined}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">{formatarCPF(p.cpf)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.telefone ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.dataNascimento ? `${calcularIdade(p.dataNascimento)} anos` : '—'}
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
                        <Link href={`/pacientes/${p.id}`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                      <DeleteButton
                        onDelete={deletarPaciente.bind(null, p.id)}
                        description={`Excluir o paciente "${p.nome}"? Esta ação não pode ser desfeita.`}
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
