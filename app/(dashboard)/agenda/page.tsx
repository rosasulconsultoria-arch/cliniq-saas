import { startOfWeek, endOfWeek } from 'date-fns'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { CalendarContainer } from '@/components/agenda/calendar-container'

export default async function AgendaPage() {
  const session = await auth()
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
    ...(userProfissionalId ? { profissionalId: userProfissionalId } : {}),
  }

  const [agendamentos, profissionais, salas] = await Promise.all([
    db.agendamento.findMany({
      where,
      include: {
        profissional: { include: { user: { select: { name: true } } } },
        paciente: { select: { id: true, nome: true } },
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

  const agendamentosSerializados = agendamentos.map((a) => ({
    id: a.id,
    dataHoraInicio: a.dataHoraInicio.toISOString(),
    dataHoraFim: a.dataHoraFim.toISOString(),
    status: a.status as string,
    valor: Number(a.valor),
    observacoes: a.observacoes,
    origem: a.origem as string,
    profissional: { id: a.profissionalId, nome: a.profissional.user.name },
    paciente: { id: a.pacienteId, nome: a.paciente.nome },
    sala: { id: a.salaId, nome: a.sala.nome },
  }))

  const profissionaisSerializados = profissionais.map((p) => ({
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
