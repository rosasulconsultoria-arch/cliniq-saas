import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfissionalForm } from '@/components/profissionais/form'
import { DisponibilidadeTab } from '@/components/profissionais/disponibilidade-tab'
import { BloqueioTab } from '@/components/profissionais/bloqueio-tab'
import { ProfissionalQRCode } from '@/components/profissionais/qr-code'
import { AsaasConfig } from '@/components/profissionais/asaas-config'
import { ParcelamentosTab } from '@/components/parcelamentos/parcelamentos-tab'
import { formatBRL } from '@/lib/utils'

interface Props {
  params: { id: string }
}

export default async function EditarProfissionalPage({ params }: Props) {
  const [profissional, comissoes, alugueis, parcelamentos] = await Promise.all([
    db.profissional.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, email: true } },
        disponibilidades: { orderBy: { diaSemana: 'asc' } },
        bloqueios: { orderBy: { dataHoraInicio: 'desc' }, take: 20 },
      },
    }),
    db.comissao.findMany({
      where: { profissionalId: params.id },
      include: { agendamento: { select: { dataHoraInicio: true, paciente: { select: { nome: true } } } } },
      orderBy: { agendamento: { dataHoraInicio: 'desc' } },
      take: 20,
    }),
    db.aluguel.findMany({
      where: { profissionalId: params.id },
      orderBy: { mesReferencia: 'desc' },
    }),
    db.parcelamento.findMany({
      where: { profissionalId: params.id },
      include: { parcelas: { orderBy: { numero: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!profissional) notFound()

  const defaultValues = {
    nome: profissional.user.name,
    email: profissional.user.email,
    especialidade: profissional.especialidade,
    crp: profissional.crp ?? '',
    tipoVinculo: profissional.tipoVinculo as 'COMISSIONADO' | 'LOCATARIO',
    comissaoPercentual: profissional.comissaoPercentual ? Number(profissional.comissaoPercentual) : null,
    valorAluguelMensal: profissional.valorAluguelMensal ? Number(profissional.valorAluguelMensal) : null,
    mesesContrato: (profissional as any).mesesContrato ?? null,
    valorConsultaPadrao: profissional.valorConsultaPadrao ? Number(profissional.valorConsultaPadrao) : null,
    bio: profissional.bio ?? '',
    ativo: profissional.ativo,
  }

  const totalComissoesPend = comissoes.filter(c => c.status === 'PENDENTE').reduce((s, c) => s + Number(c.valorComissao), 0)
  const totalAlugueisPend = alugueis.filter(a => a.status === 'PENDENTE').reduce((s, a) => s + Number(a.valor), 0)

  function statusBadge(status: string) {
    return (
      <Badge variant="outline" className={status === 'PAGO' ? 'border-green-400 text-green-600' : 'border-amber-400 text-amber-600'}>
        {status === 'PAGO' ? 'Pago' : 'Pendente'}
      </Badge>
    )
  }

  const disponibilidadesSerializadas = profissional.disponibilidades.map((d) => ({
    id: d.id,
    diaSemana: d.diaSemana,
    horaInicio: d.horaInicio,
    horaFim: d.horaFim,
  }))

  const bloqueiosSerializados = profissional.bloqueios.map((b) => ({
    id: b.id,
    dataHoraInicio: b.dataHoraInicio.toISOString(),
    dataHoraFim: b.dataHoraFim.toISOString(),
    motivo: b.motivo,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/profissionais"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profissional.user.name}</h1>
          <p className="text-sm text-muted-foreground">{profissional.especialidade}</p>
        </div>
      </div>

      <Tabs defaultValue="dados">
        <TabsList className="flex w-full overflow-x-auto h-auto flex-wrap gap-1 justify-start bg-muted p-1 rounded-lg">
          <TabsTrigger value="dados" className="flex-shrink-0">Dados</TabsTrigger>
          <TabsTrigger value="financeiro" className="flex-shrink-0">Financeiro</TabsTrigger>
          <TabsTrigger value="parcelamentos" className="flex-shrink-0">Parcelamentos</TabsTrigger>
          <TabsTrigger value="disponibilidade" className="flex-shrink-0">Disponibilidade</TabsTrigger>
          <TabsTrigger value="bloqueios" className="flex-shrink-0">Bloqueios</TabsTrigger>
          <TabsTrigger value="integracoes" className="flex-shrink-0">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Profissional</CardTitle>
              <CardDescription>Campos marcados com * são obrigatórios</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfissionalForm
                defaultValues={defaultValues}
                isEdit
                id={params.id}
                slugAgendamento={profissional.slugAgendamento}
                fotoAtual={(profissional as any).fotoBase64 ?? null}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Link de Agendamento Online</CardTitle>
              <CardDescription>Compartilhe este link para que pacientes agendem diretamente</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfissionalQRCode
                slug={profissional.slugAgendamento}
                appUrl={process.env.NEXT_PUBLIC_APP_URL}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4">
          {/* Resumo */}
          <div className="grid gap-3 sm:grid-cols-2">
            {profissional.tipoVinculo === 'COMISSIONADO' && (
              <Card className="shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">Comissões pendentes</p>
                  <p className="text-xl font-bold text-amber-600">{formatBRL(totalComissoesPend)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{Number(profissional.comissaoPercentual)}% por consulta</p>
                </CardContent>
              </Card>
            )}
            {profissional.tipoVinculo === 'LOCATARIO' && (
              <Card className="shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs text-muted-foreground">Aluguéis pendentes</p>
                  <p className="text-xl font-bold text-amber-600">{formatBRL(totalAlugueisPend)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatBRL(Number(profissional.valorAluguelMensal ?? 0))}/mês · {(profissional as any).mesesContrato ?? '—'} meses</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Comissões */}
          {profissional.tipoVinculo === 'COMISSIONADO' && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Comissões</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {comissoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma comissão gerada.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead className="text-right">Valor Bruto</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                        <TableHead className="text-right">Clínica</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Forma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comissoes.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(c.agendamento.dataHoraInicio), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">{c.agendamento.paciente.nome}</TableCell>
                          <TableCell className="text-right text-sm">{formatBRL(Number(c.valorBruto))}</TableCell>
                          <TableCell className="text-right font-semibold text-amber-600">{formatBRL(Number(c.valorComissao))}</TableCell>
                          <TableCell className="text-right font-semibold text-emerald-600">{formatBRL(Number(c.valorClinica))}</TableCell>
                          <TableCell>{statusBadge(c.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(c as any).formaPagamento ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Aluguéis */}
          {profissional.tipoVinculo === 'LOCATARIO' && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Aluguéis do Contrato</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {alugueis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum aluguel gerado.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês de Referência</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Pagamento</TableHead>
                        <TableHead>Forma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alugueis.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="text-sm capitalize">
                            {format(new Date(a.mesReferencia), 'MMMM yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatBRL(Number(a.valor))}</TableCell>
                          <TableCell>{statusBadge(a.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {a.dataPagamento ? format(new Date(a.dataPagamento), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{(a as any).formaPagamento ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="parcelamentos">
          <ParcelamentosTab
            profissionalId={params.id}
            parcelamentos={parcelamentos.map(p => ({
              ...p,
              valorTotal: Number(p.valorTotal),
              valorLiquido: Number(p.valorLiquido),
              taxaCartao: Number(p.taxaCartao),
              createdAt: p.createdAt.toISOString(),
              parcelas: p.parcelas.map(parc => ({
                ...parc,
                valor: Number(parc.valor),
                dataVencimento: parc.dataVencimento.toISOString(),
                dataPagamento: parc.dataPagamento?.toISOString() ?? null,
              })),
            }))}
          />
        </TabsContent>

        <TabsContent value="disponibilidade">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Disponibilidade de Atendimento</CardTitle>
              <CardDescription>Dias e horários em que o profissional atende</CardDescription>
            </CardHeader>
            <CardContent>
              <DisponibilidadeTab
                profissionalId={params.id}
                disponibilidadesIniciais={disponibilidadesSerializadas}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bloqueios">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bloqueios de Agenda</CardTitle>
              <CardDescription>Férias, folgas e outros períodos indisponíveis</CardDescription>
            </CardHeader>
            <CardContent>
              <BloqueioTab
                profissionalId={params.id}
                bloqueiosIniciais={bloqueiosSerializados}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Integrações</CardTitle>
              <CardDescription>Conecte serviços externos ao perfil do profissional</CardDescription>
            </CardHeader>
            <CardContent>
              <AsaasConfig
                profissionalId={params.id}
                apiKeyAtual={(profissional as any).asaasApiKey ?? null}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
