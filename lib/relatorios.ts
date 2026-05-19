import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { subDays } from 'date-fns'

export const getFaturamentoPorPeriodo = unstable_cache(
  async (ini: string, fi: string) => {
    const inicio = new Date(ini), fim = new Date(fi)
    return db.transacaoFinanceira.findMany({
      where: { tipo: 'RECEITA', data: { gte: inicio, lte: fim } },
      include: { categoria: { select: { nome: true } }, profissional: { include: { user: { select: { name: true } } } } },
      orderBy: { data: 'desc' },
    }).then(rows => rows.map(r => ({ ...r, valor: Number(r.valor) })))
  },
  ['rel-faturamento'],
  { revalidate: 300 }
)

export const getFaturamentoPorProfissional = unstable_cache(
  async (ini: string, fi: string) => {
    const inicio = new Date(ini), fim = new Date(fi)
    const grupos = await db.agendamento.groupBy({
      by: ['profissionalId'],
      where: { status: 'REALIZADO', dataHoraInicio: { gte: inicio, lte: fim } },
      _sum: { valor: true },
      _count: { id: true },
      orderBy: { _sum: { valor: 'desc' } },
    })
    const profIds = grupos.map(g => g.profissionalId)
    const profs = await db.profissional.findMany({
      where: { id: { in: profIds } },
      include: { user: { select: { name: true } } },
    })
    const map = Object.fromEntries(profs.map(p => [p.id, p.user.name]))
    return grupos.map(g => ({
      profissional: map[g.profissionalId] ?? g.profissionalId,
      consultas: g._count.id,
      faturamento: Number(g._sum.valor ?? 0),
    }))
  },
  ['rel-por-profissional'],
  { revalidate: 300 }
)

export const getFaturamentoPorSala = unstable_cache(
  async (ini: string, fi: string) => {
    const inicio = new Date(ini), fim = new Date(fi)
    const grupos = await db.agendamento.groupBy({
      by: ['salaId'],
      where: { status: 'REALIZADO', dataHoraInicio: { gte: inicio, lte: fim } },
      _sum: { valor: true },
      _count: { id: true },
    })
    const salaIds = grupos.map(g => g.salaId)
    const salas = await db.sala.findMany({ where: { id: { in: salaIds } } })
    const map = Object.fromEntries(salas.map(s => [s.id, s.nome]))
    return grupos.map(g => ({
      sala: map[g.salaId] ?? g.salaId,
      consultas: g._count.id,
      faturamento: Number(g._sum.valor ?? 0),
    })).sort((a, b) => b.faturamento - a.faturamento)
  },
  ['rel-por-sala'],
  { revalidate: 300 }
)

export const getDespesasPorCategoria = unstable_cache(
  async (ini: string, fi: string) => {
    const inicio = new Date(ini), fim = new Date(fi)
    const transacoes = await db.transacaoFinanceira.findMany({
      where: { tipo: 'DESPESA', data: { gte: inicio, lte: fim } },
      select: { valor: true, status: true, categoriaId: true, categoria: { select: { nome: true, cor: true } } },
    })
    type Cat = { nome: string; cor: string; total: number; pago: number; pendente: number }
    const agg = transacoes.reduce<Record<string, Cat>>((acc, t) => {
      const k = t.categoriaId
      if (!acc[k]) acc[k] = { nome: t.categoria.nome, cor: t.categoria.cor, total: 0, pago: 0, pendente: 0 }
      const v = Number(t.valor)
      acc[k].total += v
      if (t.status === 'PAGO') acc[k].pago += v
      else acc[k].pendente += v
      return acc
    }, {})
    return Object.values(agg).sort((a, b) => b.total - a.total)
  },
  ['rel-despesas-cat'],
  { revalidate: 300 }
)

export const getDRE = unstable_cache(
  async (ini: string, fi: string) => {
    const inicio = new Date(ini), fim = new Date(fi)
    const [rec, desp, inv, comissoes, alugueis] = await Promise.all([
      db.transacaoFinanceira.aggregate({ where: { tipo: 'RECEITA', status: 'PAGO', data: { gte: inicio, lte: fim } }, _sum: { valor: true } }),
      db.transacaoFinanceira.aggregate({ where: { tipo: 'DESPESA', status: 'PAGO', data: { gte: inicio, lte: fim } }, _sum: { valor: true } }),
      db.transacaoFinanceira.aggregate({ where: { tipo: 'INVESTIMENTO', status: 'PAGO', data: { gte: inicio, lte: fim } }, _sum: { valor: true } }),
      db.comissao.aggregate({ where: { status: 'PAGO', dataPagamento: { gte: inicio, lte: fim } }, _sum: { valorComissao: true } }),
      db.aluguel.aggregate({ where: { status: 'PAGO', dataPagamento: { gte: inicio, lte: fim } }, _sum: { valor: true } }),
    ])
    const receitas = Number(rec._sum.valor ?? 0)
    const despesas = Number(desp._sum.valor ?? 0)
    const investimentos = Number(inv._sum.valor ?? 0)
    const totalComissoes = Number(comissoes._sum.valorComissao ?? 0)
    const totalAlugueis = Number(alugueis._sum.valor ?? 0)
    const lucro = receitas + totalComissoes + totalAlugueis - despesas - investimentos
    return { receitas, despesas, investimentos, totalComissoes, totalAlugueis, lucro }
  },
  ['rel-dre'],
  { revalidate: 300 }
)

export const getComissoesPorProfissional = unstable_cache(
  async (ini: string, fi: string) => {
    const inicio = new Date(ini), fim = new Date(fi)
    const comissoes = await db.comissao.findMany({
      where: { dataPagamento: { gte: inicio, lte: fim } },
      include: { profissional: { include: { user: { select: { name: true } } } } },
    })
    type Agg = { nome: string; total: number; pago: number; pendente: number; count: number }
    const agg = comissoes.reduce<Record<string, Agg>>((acc, c) => {
      const k = c.profissionalId
      if (!acc[k]) acc[k] = { nome: c.profissional.user.name, total: 0, pago: 0, pendente: 0, count: 0 }
      const v = Number(c.valorComissao)
      acc[k].total += v
      acc[k].count++
      if (c.status === 'PAGO') acc[k].pago += v
      else acc[k].pendente += v
      return acc
    }, {})
    return Object.values(agg).sort((a, b) => b.total - a.total)
  },
  ['rel-comissoes'],
  { revalidate: 300 }
)

export const getPacientesAtivos = unstable_cache(
  async () => {
    const limite = subDays(new Date(), 90)
    const [totalAtivos, totalCadastros, comConsultaRecente] = await Promise.all([
      db.paciente.count({ where: { ativo: true } }),
      db.paciente.count(),
      db.paciente.count({
        where: {
          ativo: true,
          agendamentos: { some: { dataHoraInicio: { gte: limite }, status: 'REALIZADO' } }
        }
      }),
    ])
    return {
      totalCadastros,
      ativos: totalAtivos,
      inativos: totalCadastros - totalAtivos,
      ativosRecentes: comConsultaRecente, // consulta nos últimos 90 dias
      inativosLongos: totalAtivos - comConsultaRecente,
    }
  },
  ['rel-pacientes'],
  { revalidate: 600 }
)

export const getOcupacaoPorSala = unstable_cache(
  async (ini: string, fi: string) => {
    const inicio = new Date(ini), fim = new Date(fi)
    const dias = Math.max(1, Math.ceil((fim.getTime() - inicio.getTime()) / 86400000))
    const salas = await db.sala.findMany({ where: { ativa: true } })
    const resultado = await Promise.all(
      salas.map(async (sala) => {
        const [total, realizado] = await Promise.all([
          db.agendamento.count({ where: { salaId: sala.id, dataHoraInicio: { gte: inicio, lte: fim }, status: { notIn: ['CANCELADO'] } } }),
          db.agendamento.count({ where: { salaId: sala.id, dataHoraInicio: { gte: inicio, lte: fim }, status: 'REALIZADO' } }),
        ])
        const slotsTotal = dias * 14
        const taxa = slotsTotal > 0 ? (total / slotsTotal) * 100 : 0
        return { sala: sala.nome, agendado: total, realizado, slotsTotal, taxa }
      })
    )
    return resultado.sort((a, b) => b.taxa - a.taxa)
  },
  ['rel-ocupacao-sala'],
  { revalidate: 300 }
)
