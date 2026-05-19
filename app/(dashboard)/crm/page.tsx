import { getCrmPacientes, getCrmStats } from './actions'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, MapPin, Tag, CalendarCheck } from 'lucide-react'

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CrmPage({ searchParams }: Props) {
  const sp = await searchParams
  const filtroCidade = typeof sp.cidade === 'string' ? sp.cidade : undefined
  const filtroServico = typeof sp.servico === 'string' ? sp.servico : undefined

  const [pacientes, stats, servicos] = await Promise.all([
    getCrmPacientes({ cidade: filtroCidade, servicoId: filtroServico }),
    getCrmStats(),
    db.servico.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
  ])

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Total de Pacientes</p>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-bold text-indigo-600">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Top Cidades
            </p>
            <div className="space-y-1">
              {stats.porCidade.slice(0, 3).map(c => (
                <div key={c.cidade} className="flex justify-between text-xs">
                  <span className="truncate text-muted-foreground">{c.cidade}</span>
                  <span className="font-semibold shrink-0 ml-2">{c.total}</span>
                </div>
              ))}
              {stats.porCidade.length === 0 && <p className="text-xs text-muted-foreground">Sem dados de cidade</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" /> Top Serviços
            </p>
            <div className="space-y-1">
              {stats.porServico.slice(0, 3).map(s => (
                <div key={s.nome} className="flex justify-between text-xs">
                  <span className="truncate text-muted-foreground">{s.nome}</span>
                  <span className="font-semibold shrink-0 ml-2">{s.count}</span>
                </div>
              ))}
              {stats.porServico.length === 0 && <p className="text-xs text-muted-foreground">Sem dados</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Com Email</p>
              <CalendarCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {pacientes.filter(p => p.email).length}
            </p>
            <p className="text-xs text-muted-foreground">
              {pacientes.filter(p => p.telefone).length} com WhatsApp
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Cidade</label>
          <input
            name="cidade"
            defaultValue={filtroCidade ?? ''}
            placeholder="Ex: São Paulo"
            className="h-9 px-3 rounded-md border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring w-44"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Serviço</label>
          <select name="servico" defaultValue={filtroServico ?? ''}
            className="h-9 px-3 rounded-md border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring w-52">
            <option value="">Todos os serviços</option>
            {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <button type="submit"
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          Filtrar
        </button>
        {(filtroCidade || filtroServico) && (
          <a href="/crm" className="h-9 px-4 rounded-md border text-sm font-medium flex items-center hover:bg-muted transition-colors">
            Limpar
          </a>
        )}
      </form>

      {/* Tabela */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Localização</TableHead>
              <TableHead>Serviços</TableHead>
              <TableHead>Última Consulta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pacientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                  Nenhum paciente encontrado.
                </TableCell>
              </TableRow>
            ) : pacientes.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nome}</TableCell>
                <TableCell>
                  <div className="text-sm space-y-0.5">
                    {p.email && <p className="text-muted-foreground truncate max-w-[180px]">{p.email}</p>}
                    {p.telefone && <p className="text-muted-foreground">{p.telefone}</p>}
                    {!p.email && !p.telefone && <span className="text-muted-foreground/50 text-xs">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[p.bairro, p.cidade].filter(Boolean).join(', ') || '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {p.servicos.length === 0 ? <span className="text-xs text-muted-foreground">—</span>
                      : p.servicos.slice(0, 2).map(s => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    {p.servicos.length > 2 && <Badge variant="outline" className="text-xs">+{p.servicos.length - 2}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.ultimaConsulta
                    ? format(new Date(p.ultimaConsulta), "dd/MM/yyyy", { locale: ptBR })
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
