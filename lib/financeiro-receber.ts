import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant-context'

export async function getContasAReceber() {
  const prisma = getTenantDb()
  // Parcela não tem tenantId direto — filtrada via parcelamento.tenantId
  const tenantId = getTenantId()

  const [agendamentosPendentes, comissoesPendentes, alugueisPendentes, receitasPendentes, parcelasPendentes] =
    await Promise.all([
      prisma.agendamento.findMany({
        where: { status: { in: ['AGENDADO', 'CONFIRMADO'] } },
        include: {
          profissional: { include: { user: { select: { name: true } } } },
          paciente: { select: { nome: true } },
        },
        orderBy: { dataHoraInicio: 'asc' },
      }),
      prisma.comissao.findMany({
        where: { status: 'PENDENTE' },
        include: {
          profissional: { include: { user: { select: { name: true } } } },
          agendamento: { select: { dataHoraInicio: true } },
        },
        orderBy: { agendamento: { dataHoraInicio: 'desc' } },
      }),
      prisma.aluguel.findMany({
        where: { status: 'PENDENTE' },
        include: {
          profissional: { include: { user: { select: { name: true } } } },
        },
        orderBy: { mesReferencia: 'desc' },
      }),
      prisma.transacaoFinanceira.findMany({
        where: { tipo: 'RECEITA', status: 'PENDENTE' },
        include: { categoria: { select: { nome: true } } },
        orderBy: { data: 'desc' },
      }),
      // Parcela não tem tenantId — isolamento garantido via parcelamento.tenantId
      db.parcela.findMany({
        where: { status: 'PENDENTE', parcelamento: { status: 'ATIVO', tenantId } },
        include: {
          parcelamento: {
            include: { profissional: { include: { user: { select: { name: true } } } } },
          },
        },
        orderBy: { dataVencimento: 'asc' },
      }),
    ])

  const totalAtendimentos = agendamentosPendentes.reduce((s, a) => s + Number(a.valor), 0)
  const totalComissoes = comissoesPendentes.reduce((s, c) => s + Number(c.valorComissao), 0)
  const totalAlugueis = alugueisPendentes.reduce((s, a) => s + Number(a.valor), 0)
  const totalReceitas = receitasPendentes.reduce((s, t) => s + Number(t.valor), 0)
  const totalParcelas = parcelasPendentes.reduce((s, p) => s + Number(p.valor), 0)
  const totalGeral = totalAtendimentos + totalComissoes + totalAlugueis + totalReceitas + totalParcelas

  return {
    totalGeral,
    totalAtendimentos,
    totalComissoes,
    totalAlugueis,
    totalReceitas,
    totalParcelas,
    parcelasPendentes: parcelasPendentes.map(p => ({
      id: p.id,
      numero: p.numero,
      total: p.parcelamento.totalParcelas,
      descricao: p.parcelamento.descricao,
      profissional: p.parcelamento.profissional.user.name,
      bandeira: p.parcelamento.bandeira,
      tipo: p.parcelamento.tipoPagamento,
      dataVencimento: p.dataVencimento.toISOString(),
      valor: Number(p.valor),
    })),
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
