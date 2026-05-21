import { startOfWeek, endOfWeek } from 'date-fns'
import { auth } from '@/lib/auth'
import { getTenantDb } from '@/lib/prisma'
import { CalendarContainer } from '@/components/agenda/calendar-container'

export default async function AgendaPage() {
  const session = await auth()
  const db = getTenantDb()
  const hoje = new Date()
  const inicio = startOfWeek(hoje, { weekStartsOn: 1 })
  const fim = endOfWeek(hoje, { weekStartsOn: 1 })

  // Profissional logado: vê apenas a própria agenda
  let userProfissionalId: string | undefined
  if (session?.user?.role === 'PROFISSIONAL') {
    const prof = await db.profissional.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    userProfissionalId = prof?.id
  }

  const where: Record<string, unknown> = {
    dataHoraInicio: { gte: inicio, lte: fim },
  }

  const [agendamentos, profissionais, salas] = await Promise.all([
    db.agendamento.findMany({
      where,
      include: {
        profissional: { include: { user: { select: { name: true } } } },
        paciente: { select: { id: true, nome: true, email: true, telefone: true } },
        sala: { select: { id: true, nome: true } },
      },
      orderBy: { dataHoraInicio: 'asc' },
    }),
    db.profissional.findMany({
      where: { ativo: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: 'asc' } },
    }),
    db.sala.findMany({
      where: { ativa: true },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agendamentosSerializados = (agendamentos as any[]).map((a) => ({
    id: a.id,
    dataHoraInicio: a.dataHoraInicio.toISOString(),
    dataHoraFim: a.dataHoraFim.toISOString(),
    status: a.status as string,
    valor: Number(a.valor),
    observacoes: a.observacoes,
    origem: a.origem as string,
    tipoCobranca: a.tipoCobranca ?? null,
    totalSessoes: a.totalSessoes ?? null,
    formaPagamento: a.formaPagamento ?? null,
    bandeiraCartao: a.bandeiraCartao ?? null,
    numeroParcelas: a.numeroParcelas ?? null,
    confirmacaoEnviada: a.confirmacaoEnviada ?? false,
    asaasPaymentId: a.asaasPaymentId ?? null,
    asaasInvoiceUrl: a.asaasInvoiceUrl ?? null,
    asaasPaymentStatus: a.asaasPaymentStatus ?? null,
    profissional: { id: a.profissionalId, nome: a.profissional.user.name, foto: a.profissional.fotoBase64 ?? null, temAsaas: !!a.profissional.asaasApiKey },
    paciente: { id: a.pacienteId, nome: a.paciente.nome, email: a.paciente.email ?? null, telefone: a.paciente.telefone ?? null },
    sala: { id: a.salaId, nome: a.sala.nome },
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profissionaisSerializados = (profissionais as any[]).map((p) => ({
    id: p.id,
    nome: p.user.name,
    valorConsultaPadrao: p.valorConsultaPadrao ? Number(p.valorConsultaPadrao) : null,
    tipoVinculo: p.tipoVinculo as string,
  }))

  return (
    <CalendarContainer
      agendamentosInicial={agendamentosSerializados}
      profissionais={profissionaisSerializados}
      salas={salas}
      userRole={session?.user?.role ?? 'RECEPCAO'}
      userProfissionalId={userProfissionalId}
    />
  )
}
