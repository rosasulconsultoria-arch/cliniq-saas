import { getContasAReceber } from '@/lib/financeiro-receber'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBRL } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CalendarClock, Handshake, Building2, Receipt, CreditCard } from 'lucide-react'
import { InfoTooltip } from '@/components/ui/info-tooltip'

export default async function ContasAReceberPage() {
  const d = await getContasAReceber()

  const STATUS_LABEL: Record<string, string> = {
    AGENDADO: 'Agendado',
    CONFIRMADO: 'Confirmado',
  }
  const STATUS_COR: Record<string, string> = {
    AGENDADO: 'border-blue-400 text-blue-600',
    CONFIRMADO: 'border-green-400 text-green-600',
  }

  const cards = [
    { titulo: 'Total a Receber', valor: d.totalGeral, cor: 'text-indigo-600', tooltip: 'Soma de todos os valores pendentes: atendimentos futuros, comissões, aluguéis, parcelas de cartão e outras receitas ainda não recebidas.' },
    { titulo: 'Atendimentos Futuros', valor: d.totalAtendimentos, cor: 'text-blue-600', tooltip: 'Valor total dos agendamentos com status Agendado ou Confirmado. O pagamento ainda não foi recebido pois a consulta não foi realizada.' },
    { titulo: 'Comissões Pendentes', valor: d.totalComissoes, cor: 'text-amber-600', tooltip: 'Comissões devidas aos profissionais comissionados por consultas já realizadas que ainda aguardam pagamento pela clínica.' },
    { titulo: 'Aluguéis Pendentes', valor: d.totalAlugueis, cor: 'text-orange-600', tooltip: 'Mensalidades de aluguel de sala em aberto de profissionais locatários, acumuladas de todos os meses não quitados.' },
    { titulo: 'Parcelas Cartão', valor: d.totalParcelas, cor: 'text-purple-600', tooltip: 'Parcelas de cartão de crédito cadastradas nos parcelamentos que ainda não foram liquidadas ou não venceram.' },
    { titulo: 'Outras Receitas', valor: d.totalReceitas, cor: 'text-emerald-600', tooltip: 'Receitas avulsas cadastradas manualmente no Financeiro com status Pendente — ainda não recebidas.' },
  ]

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(c => (
          <Card key={c.titulo} className="shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{c.titulo}</p>
                <InfoTooltip text={c.tooltip} />
              </div>
              <p className={`text-xl font-bold ${c.cor}`}>{formatBRL(c.valor)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Atendimentos futuros */}
      {d.agendamentosPendentes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Atendimentos Agendados
            <span className="text-xs font-normal">({d.agendamentosPendentes.length} consultas · {formatBRL(d.totalAtendimentos)})</span>
          </h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.agendamentosPendentes.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(parseISO(a.data), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{a.paciente}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.profissional}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COR[a.status] ?? ''}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">{formatBRL(a.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Comissões pendentes */}
      {d.comissoesPendentes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Handshake className="h-4 w-4" /> Comissões a Receber
            <span className="text-xs font-normal">({d.comissoesPendentes.length} · {formatBRL(d.totalComissoes)})</span>
          </h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Data da Consulta</TableHead>
                  <TableHead>Valor Bruto</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.comissoesPendentes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.profissional}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(c.dataConsulta), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatBRL(c.valorBruto)}</TableCell>
                    <TableCell className="text-right font-semibold text-amber-600">
                      {formatBRL(c.valorComissao)}
                      <span className="text-xs text-muted-foreground ml-1">({c.percentual}%)</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Aluguéis pendentes */}
      {d.alugueisPendentes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Aluguéis a Receber
            <span className="text-xs font-normal">({d.alugueisPendentes.length} · {formatBRL(d.totalAlugueis)})</span>
          </h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Mês de Referência</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.alugueisPendentes.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.profissional}</TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {format(parseISO(a.mesReferencia), 'MMMM yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-orange-600">{formatBRL(a.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Outras receitas pendentes */}
      {d.receitasPendentes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Outras Receitas Pendentes
            <span className="text-xs font-normal">({d.receitasPendentes.length} · {formatBRL(d.totalReceitas)})</span>
          </h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.receitasPendentes.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(parseISO(r.data), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{r.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.categoria}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">{formatBRL(r.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Parcelas de cartão */}
      {d.parcelasPendentes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Parcelas de Cartão Pendentes
            <span className="text-xs font-normal">({d.parcelasPendentes.length} · {formatBRL(d.totalParcelas)})</span>
          </h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cartão</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.parcelasPendentes.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(parseISO(p.dataVencimento), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{p.profissional}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{p.descricao}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.bandeira} · {p.tipo === 'CREDITO' ? 'Crédito' : 'Débito'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.numero}/{p.total}</TableCell>
                    <TableCell className="text-right font-semibold text-purple-600">{formatBRL(p.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {d.totalGeral === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum valor pendente a receber.</p>
        </div>
      )}
    </div>
  )
}
