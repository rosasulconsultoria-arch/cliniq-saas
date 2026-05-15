import { unstable_cache } from 'next/cache'
import {
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear,
  parseISO, format, eachDayOfInterval, differenceInCalendarDays
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { db } from '@/lib/db'

export interface PeriodoDates {
  inicio: Date
  fim: Date
  inicioAnterior: Date
  fimAnterior: Date
  label: string
}

export function getPeriodDates(
  periodo: string,
  de?: string,
  ate?: string
): PeriodoDates {
  const hoje = new Date()
  let inicio: Date, fim: Date, label: string

  switch (periodo) {
    case 'mes_anterior': {
      const ant = subMonths(hoje, 1)
      inicio = startOfMonth(ant)
      fim = endOfMonth(ant)
      label = format(ant, "MMMM 'de' yyyy", { locale: ptBR })
      break
    }
    case 'ultimos_3_meses': {
      inicio = startOfMonth(subMonths(hoje, 2))
      fim = endOfMonth(hoje)
      label = 'Últimos 3 meses'
      break
    }
    case 'ano': {
      inicio = startOfYear(hoje)
      fim = endOfYear(hoje)
      label = `Ano ${hoje.getFullYear()}`
      break
    }
    case 'customizado': {
      inicio = de ? parseISO(de) : startOfMonth(hoje)
      fim = ate ? parseISO(ate) : endOfMonth(hoje)
      label = `${format(inicio, 'dd/MM/yyyy')} – ${format(fim, 'dd/MM/yyyy')}`
      break
    }
    default: {
      inicio = startOfMonth(hoje)
      fim = endOfMonth(hoje)
      label = format(hoje, "MMMM 'de' yyyy", { locale: ptBR })
    }
  }

  const duracao = fim.getTime() - inicio.getTime()
  const fimAnterior = new Date(inicio.getTime() - 1)
  const inicioAnterior = new Date(fimAnterior.getTime() - duracao)

  return { inicio, fim, inicioAnterior, fimAnterior, label }
}

function pct(atual: number, anterior: number): number {
  if (anterior === 0) return atual > 0 ? 100 : 0
  return ((atual - anterior) / anterior) * 100
}

export const getDashboardKPIs = unstable_cache(
  async (inicioStr: string, fimStr: string, inicioAntStr: string, fimAntStr: string) => {
    const inicio = new Date(inicioStr)
    const fim = new Date(fimStr)
    const inicioAnt = new Date(inicioAntStr)
    const fimAnt = new Date(fimAntStr)

    const [
      recAtual, recAnt,
      despAtual, despAnt,
      consAtual, consAnt,
      noShowAtual, totalAgend,
      salas,
    ] = await Promise.all([
      db.transacaoFinanceira.aggregate({ where: { tipo: 'RECEITA', status: 'PAGO', data: { gte: inicio, lte: fim } }, _sum: { valor: true } }),
      db.transacaoFinanceira.aggregate({ where: { tipo: 'RECEITA', status: 'PAGO', data: { gte: inicioAnt, lte: fimAnt } }, _sum: { valor: true } }),
      db.transacaoFinanceira.aggregate({ where: { tipo: 'DESPESA', status: 'PAGO', data: { gte: inicio, lte: fim } }, _sum: { valor: true } }),
      db.transacaoFinanceira.aggregate({ where: { tipo: 'DESPESA', status: 'PAGO', data: { gte: inicioAnt, lte: fimAnt } }, _sum: { valor: true } }),
      db.agendamento.count({ where: { status: 'REALIZADO', dataHoraInicio: { gte: inicio, lte: fim } } }),
      db.agendamento.count({ where: { status: 'REALIZADO', dataHoraInicio: { gte: inicioAnt, lte: fimAnt } } }),
      db.agendamento.count({ where: { status: { in: ['FALTOU', 'CANCELADO'] }, dataHoraInicio: { gte: inicio, lte: fim } } }),
      db.agendamento.count({ where: { dataHoraInicio: { gte: inicio, lte: fim } } }),
      db.sala.count({ where: { ativa: true } }),
    ])

    const receita = Number(recAtual._sum.valor ?? 0)
    const receitaAnt = Number(recAnt._sum.valor ?? 0)
    const despesa = Number(despAtual._sum.valor ?? 0)
    const despesaAnt = Number(despAnt._sum.valor ?? 0)
    const consultas = consAtual
    const consultasAnt = consAnt
    const dias = Math.max(1, differenceInCalendarDays(fim, inicio) + 1)
    const slotsTotal = Math.max(1, salas * dias * 14) // 14 slots×50min/dia/sala
    const ocupacao = (consultas / slotsTotal) * 100
    const ticketMedio = consultas > 0 ? receita / consultas : 0
    const ticketMedioAnt = consultasAnt > 0 ? receitaAnt / consultasAnt : 0
    const noShow = totalAgend > 0 ? (noShowAtual / totalAgend) * 100 : 0

    return {
      faturamento: { valor: receita, variacao: pct(receita, receitaAnt) },
      despesas: { valor: despesa, variacao: pct(despesa, despesaAnt) },
      lucro: { valor: receita - despesa, variacao: pct(receita - despesa, receitaAnt - despesaAnt) },
      consultas: { valor: consultas, variacao: pct(consultas, consultasAnt) },
      ocupacao: { valor: ocupacao, variacao: 0 },
      ticketMedio: { valor: ticketMedio, variacao: pct(ticketMedio, ticketMedioAnt) },
      noShow: { valor: noShow, variacao: 0 },
    }
  },
  ['dashboard-kpis'],
  { revalidate: 300 }
)

export const getDashboardCharts = unstable_cache(
  async (inicioStr: string, fimStr: string) => {
    const inicio = new Date(inicioStr)
    const fim = new Date(fimStr)
    const hoje = new Date()

    // 1. Faturamento 12 meses
    const meses12 = Array.from({ length: 12 }, (_, i) => subMonths(hoje, 11 - i))
    const faturamento12 = await Promise.all(
      meses12.map(async (mes) => {
        const ini = startOfMonth(mes)
        const fi = endOfMonth(mes)
        const [r, d] = await Promise.all([
          db.transacaoFinanceira.aggregate({ where: { tipo: 'RECEITA', status: 'PAGO', data: { gte: ini, lte: fi } }, _sum: { valor: true } }),
          db.transacaoFinanceira.aggregate({ where: { tipo: 'DESPESA', status: 'PAGO', data: { gte: ini, lte: fi } }, _sum: { valor: true } }),
        ])
        return {
          mes: format(mes, 'MMM/yy', { locale: ptBR }),
          receita: Number(r._sum.valor ?? 0),
          despesa: Number(d._sum.valor ?? 0),
        }
      })
    )

    // 2. Consultas por profissional (período selecionado)
    const consultasPorProf = await db.agendamento.groupBy({
      by: ['profissionalId'],
      where: { status: 'REALIZADO', dataHoraInicio: { gte: inicio, lte: fim } },
      _count: { id: true },
      _sum: { valor: true },
    })
    const profIds = consultasPorProf.map(r => r.profissionalId)
    const profissionais = await db.profissional.findMany({
      where: { id: { in: profIds } },
      include: { user: { select: { name: true } } },
    })
    const profMap = Object.fromEntries(profissionais.map(p => [p.id, p.user.name]))
    const consultasProfData = consultasPorProf.map(r => ({
      nome: profMap[r.profissionalId] ?? r.profissionalId,
      consultas: r._count.id,
      faturamento: Number(r._sum.valor ?? 0),
    })).sort((a, b) => b.faturamento - a.faturamento).slice(0, 8)

    // 3. Ocupação por dia (período selecionado, max 31 dias)
    const dias = eachDayOfInterval({ start: inicio, end: fim }).slice(0, 31)
    const ocupacaoDias = await Promise.all(
      dias.map(async (dia) => {
        const ini = new Date(dia); ini.setHours(0, 0, 0)
        const fi = new Date(dia); fi.setHours(23, 59, 59)
        const count = await db.agendamento.count({
          where: { status: { notIn: ['CANCELADO'] }, dataHoraInicio: { gte: ini, lte: fi } }
        })
        return { dia: format(dia, 'dd/MM', { locale: ptBR }), consultas: count }
      })
    )

    // 4. Receitas por origem
    const [publico, interno] = await Promise.all([
      db.agendamento.aggregate({ where: { status: 'REALIZADO', origem: 'PUBLICO', dataHoraInicio: { gte: inicio, lte: fim } }, _sum: { valor: true } }),
      db.agendamento.aggregate({ where: { status: 'REALIZADO', origem: 'INTERNO', dataHoraInicio: { gte: inicio, lte: fim } }, _sum: { valor: true } }),
    ])

    return {
      faturamento12,
      consultasPorProfissional: consultasProfData,
      ocupacaoDias,
      receitaOrigem: [
        { nome: 'Online', valor: Number(publico._sum.valor ?? 0) },
        { nome: 'Interno', valor: Number(interno._sum.valor ?? 0) },
      ],
    }
  },
  ['dashboard-charts'],
  { revalidate: 300 }
)

export const getDashboardListas = unstable_cache(
  async () => {
    const hoje = new Date()
    const startHoje = new Date(hoje); startHoje.setHours(0, 0, 0)
    const endHoje = new Date(hoje); endHoje.setHours(23, 59, 59)
    const ini = startOfMonth(hoje)
    const fi = endOfMonth(hoje)

    const [consultasHoje, topProfissionais, ultimasTransacoes] = await Promise.all([
      db.agendamento.findMany({
        where: { dataHoraInicio: { gte: startHoje, lte: endHoje }, status: { notIn: ['CANCELADO'] } },
        include: {
          profissional: { include: { user: { select: { name: true } } } },
          paciente: { select: { nome: true } },
          sala: { select: { nome: true } },
        },
        orderBy: { dataHoraInicio: 'asc' },
        take: 5,
      }),
      db.agendamento.groupBy({
        by: ['profissionalId'],
        where: { status: 'REALIZADO', dataHoraInicio: { gte: ini, lte: fi } },
        _sum: { valor: true },
        _count: { id: true },
        orderBy: { _sum: { valor: 'desc' } },
        take: 5,
      }),
      db.transacaoFinanceira.findMany({
        include: { categoria: { select: { nome: true, cor: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    const profIds = topProfissionais.map(r => r.profissionalId)
    const profissionais = await db.profissional.findMany({
      where: { id: { in: profIds } },
      include: { user: { select: { name: true } } },
    })
    const profMap = Object.fromEntries(profissionais.map(p => [p.id, p.user.name]))

    return {
      consultasHoje: consultasHoje.map(a => ({
        id: a.id,
        horario: a.dataHoraInicio.toISOString(),
        paciente: a.paciente.nome,
        profissional: a.profissional.user.name,
        sala: a.sala.nome,
        status: a.status,
      })),
      topProfissionais: topProfissionais.map(r => ({
        nome: profMap[r.profissionalId] ?? r.profissionalId,
        consultas: r._count.id,
        faturamento: Number(r._sum.valor ?? 0),
      })),
      ultimasTransacoes: ultimasTransacoes.map(t => ({
        id: t.id,
        descricao: t.descricao,
        valor: Number(t.valor),
        tipo: t.tipo,
        status: t.status,
        data: t.data.toISOString(),
        categoria: t.categoria.nome,
        categoriaCor: t.categoria.cor,
      })),
    }
  },
  ['dashboard-listas'],
  { revalidate: 120 }
)
