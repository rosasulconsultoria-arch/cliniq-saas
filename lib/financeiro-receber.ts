import { db } from '@/lib/db'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function getContasAReceber() {
  const [agendamentosPendentes, comissoesPendentes, alugueisPendentes, receitasPendentes] =
    await Promise.all([
      // Atendimentos agendados/confirmados (futura receita)
      db.agendamento.findMany({
        where: { status: { in: ['AGENDADO', 'CONFIRMADO'] } },
        include: {
          profissional: { include: { user: { select: { name: true } } } },
          paciente: { select: { nome: true } },
        },
        orderBy: { dataHoraInicio: 'asc' },
      }),
      // Comissões que profissionais devem à clínica
      db.comissao.findMany({
        where: { status: 'PENDENTE' },
        include: {
          profissional: { include: { user: { select: { name: true } } } },
          agendamento: { select: { dataHoraInicio: true } },
        },
        orderBy: { agendamento: { dataHoraInicio: 'desc' } },
      }),
      // Aluguéis que profissionais devem à clínica
      db.aluguel.findMany({
        where: { status: 'PENDENTE' },
        include: {
          profissional: { include: { user: { select: { name: true } } } },
        },
        orderBy: { mesReferencia: 'desc' },
      }),
      // Receitas lançadas mas ainda pendentes
      db.transacaoFinanceira.findMany({
        where: { tipo: 'RECEITA', status: 'PENDENTE' },
        include: { categoria: { select: { nome: true } } },
        orderBy: { data: 'desc' },
      }),
    ])

  const totalAtendimentos = agendamentosPendentes.reduce((s, a) => s + Number(a.valor), 0)
  const totalComissoes = comissoesPendentes.reduce((s, c) => s + Number(c.valorComissao), 0)
  const totalAlugueis = alugueisPendentes.reduce((s, a) => s + Number(a.valor), 0)
  const totalReceitas = receitasPendentes.reduce((s, t) => s + Number(t.valor), 0)
  const totalGeral = totalAtendimentos + totalComissoes + totalAlugueis + totalReceitas

  return {
    totalGeral,
    totalAtendimentos,
    totalComissoes,
    totalAlugueis,
    totalReceitas,
    agendamentosPendentes: agendamentosPendentes.map(a => ({
      id: a.id,
      paciente: a.paciente.nome,
      profissional: a.profissional.user.name,
      data: a.dataHoraInicio.toISOString(),
      valor: Number(a.valor),
      status: a.status,
    })),
    comissoesPendentes: comissoesPendentes.map(c => ({
      id: c.id,
      profissional: c.profissional.user.name,
      dataConsulta: c.agendamento.dataHoraInicio.toISOString(),
      valorComissao: Number(c.valorComissao),
      valorBruto: Number(c.valorBruto),
      percentual: Number(c.percentual),
    })),
    alugueisPendentes: alugueisPendentes.map(a => ({
      id: a.id,
      profissional: a.profissional.user.name,
      mesReferencia: a.mesReferencia.toISOString(),
      valor: Number(a.valor),
    })),
    receitasPendentes: receitasPendentes.map(t => ({
      id: t.id,
      descricao: t.descricao,
      categoria: t.categoria.nome,
      data: t.data.toISOString(),
      valor: Number(t.valor),
    })),
  }
}
