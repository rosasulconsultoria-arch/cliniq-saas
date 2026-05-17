import { db } from '@/lib/db'
import { startOfMonth, endOfMonth, subDays } from 'date-fns'

export async function getDashboardProfissional(profissionalId: string) {
  const hoje = new Date()
  const inicioMes = startOfMonth(hoje)
  const fimMes = endOfMonth(hoje)
  const limite90 = subDays(hoje, 90)

  const [
    agendamentosMes,
    comissoesPendentes,
    aluguelPendente,
    consultasHoje,
    pacientesIds,
    despesasPendentes,
  ] = await Promise.all([
    db.agendamento.findMany({
      where: {
        profissionalId,
        dataHoraInicio: { gte: inicioMes, lte: fimMes },
        status: { notIn: ['CANCELADO'] },
      },
      select: { status: true, valor: true, pacienteId: true, dataHoraInicio: true },
    }),
    db.comissao.aggregate({
      where: { profissionalId, status: 'PENDENTE' },
      _sum: { valorComissao: true },
    }),
    db.aluguel.aggregate({
      where: { profissionalId, status: 'PENDENTE' },
      _sum: { valor: true },
    }),
    db.agendamento.findMany({
      where: {
        profissionalId,
        dataHoraInicio: {
          gte: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
          lt: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1),
        },
        status: { notIn: ['CANCELADO'] },
      },
      include: {
        paciente: { select: { nome: true } },
        sala: { select: { nome: true } },
      },
      orderBy: { dataHoraInicio: 'asc' },
    }),
    db.agendamento.findMany({
      where: { profissionalId, status: 'REALIZADO' },
      select: { pacienteId: true, dataHoraInicio: true },
      distinct: ['pacienteId'],
    }),
    db.despesaProfissional.aggregate({
      where: { profissionalId, status: 'PENDENTE' },
      _sum: { valor: true },
    }),
  ])

  const realizados = agendamentosMes.filter(a => a.status === 'REALIZADO')
  const faturamentoMes = realizados.reduce((s, a) => s + Number(a.valor ?? 0), 0)
  const consultasMes = realizados.length
  const noShowMes = agendamentosMes.filter(a => a.status === 'FALTOU').length
  const agendadosMes = agendamentosMes.filter(a => ['AGENDADO', 'CONFIRMADO'].includes(a.status)).length

  const pacientesAtivos = pacientesIds.filter(
    p => p.dataHoraInicio >= limite90
  ).length
  const pacientesTotal = pacientesIds.length
  const pacientesInativos = pacientesTotal - pacientesAtivos

  const valorDevidoPendente =
    Number(comissoesPendentes._sum.valorComissao ?? 0) +
    Number(aluguelPendente._sum.valor ?? 0)

  const despesasPropriasTotal = Number(despesasPendentes._sum.valor ?? 0)

  return {
    faturamentoMes,
    consultasMes,
    noShowMes,
    agendadosMes,
    pacientesAtivos,
    pacientesInativos,
    pacientesTotal,
    valorDevidoPendente,
    despesasPropriasTotal,
    consultasHoje: consultasHoje.map(a => ({
      id: a.id,
      paciente: a.paciente.nome,
      sala: a.sala.nome,
      horario: a.dataHoraInicio.toISOString(),
      status: a.status,
    })),
  }
}
