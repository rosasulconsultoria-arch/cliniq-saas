import { db } from '@/lib/db'
import { eachDayOfInterval, format, startOfDay } from 'date-fns'

export async function getFluxoCaixa(inicio: string, fim: string) {
  const dtInicio = new Date(inicio)
  const dtFim = new Date(fim)

  const [entradas, saidas, saldoAnterior, parcelasVencendo] = await Promise.all([
    // Receitas pagas no período
    db.transacaoFinanceira.findMany({
      where: { tipo: 'RECEITA', status: 'PAGO', data: { gte: dtInicio, lte: dtFim } },
      select: { data: true, valor: true, descricao: true, categoria: { select: { nome: true } } },
      orderBy: { data: 'asc' },
    }),
    // Despesas + Investimentos pagos no período
    db.transacaoFinanceira.findMany({
      where: { tipo: { in: ['DESPESA', 'INVESTIMENTO'] }, status: 'PAGO', data: { gte: dtInicio, lte: dtFim } },
      select: { data: true, valor: true, descricao: true, tipo: true, categoria: { select: { nome: true } } },
      orderBy: { data: 'asc' },
    }),
    // Saldo acumulado antes do período
    db.transacaoFinanceira.aggregate({
      where: { status: 'PAGO', data: { lt: dtInicio } },
      _sum: { valor: true },
    }),
    // Parcelas de cartão com vencimento no período (previstas)
    db.parcela.findMany({
      where: {
        dataVencimento: { gte: dtInicio, lte: dtFim },
        parcelamento: { status: 'ATIVO' },
      },
      include: { parcelamento: { select: { descricao: true, bandeira: true, profissionalId: true } } },
      orderBy: { dataVencimento: 'asc' },
    }),
  ])

  // Agrupar por dia
  const dias = eachDayOfInterval({ start: dtInicio, end: dtFim })
  const totalEntradas = entradas.reduce((s, t) => s + Number(t.valor), 0)
  const totalSaidas = saidas.reduce((s, t) => s + Number(t.valor), 0)
  const saldoInicial = Number(saldoAnterior._sum.valor ?? 0)

  // Para calcular o saldo inicial real, precisa também subtrair despesas anteriores
  const [despesasAnteriores] = await Promise.all([
    db.transacaoFinanceira.aggregate({
      where: { tipo: { in: ['DESPESA', 'INVESTIMENTO'] }, status: 'PAGO', data: { lt: dtInicio } },
      _sum: { valor: true },
    }),
  ])
  const saldoInicialReal = saldoInicial - Number(despesasAnteriores._sum.valor ?? 0)

  // Mapa dia → valores
  const entradasPorDia = new Map<string, number>()
  const saidasPorDia = new Map<string, number>()

  // Parcelas pagas (já recebidas)
  for (const p of parcelasVencendo.filter(p => p.status === 'PAGO')) {
    const k = format(new Date(p.dataVencimento), 'yyyy-MM-dd')
    entradasPorDia.set(k, (entradasPorDia.get(k) ?? 0) + Number(p.valor))
  }

  for (const t of entradas) {
    const k = format(new Date(t.data), 'yyyy-MM-dd')
    entradasPorDia.set(k, (entradasPorDia.get(k) ?? 0) + Number(t.valor))
  }
  for (const t of saidas) {
    const k = format(new Date(t.data), 'yyyy-MM-dd')
    saidasPorDia.set(k, (saidasPorDia.get(k) ?? 0) + Number(t.valor))
  }

  let saldoAcumulado = saldoInicialReal
  const fluxoDiario = dias.map(dia => {
    const k = format(dia, 'yyyy-MM-dd')
    const e = entradasPorDia.get(k) ?? 0
    const s = saidasPorDia.get(k) ?? 0
    saldoAcumulado += e - s
    return { data: k, entradas: e, saidas: s, saldo: saldoAcumulado }
  })

  const parcelasPrevistas = parcelasVencendo.filter(p => p.status === 'PENDENTE')

  return {
    saldoInicial: saldoInicialReal,
    totalEntradas,
    totalSaidas,
    totalParcelasPrevistas: parcelasPrevistas.reduce((s, p) => s + Number(p.valor), 0),
    saldoFinal: saldoInicialReal + totalEntradas - totalSaidas,
    fluxoDiario,
    parcelasPrevistas: parcelasPrevistas.map(p => ({
      id: p.id,
      data: format(new Date(p.dataVencimento), 'yyyy-MM-dd'),
      descricao: `${p.parcelamento.descricao} (${p.parcelamento.bandeira})`,
      valor: Number(p.valor),
      status: p.status,
    })),
    lancamentos: [
      ...entradas.map(t => ({
        data: format(new Date(t.data), 'yyyy-MM-dd'),
        descricao: t.descricao,
        categoria: t.categoria.nome,
        tipo: 'RECEITA' as const,
        valor: Number(t.valor),
      })),
      ...saidas.map(t => ({
        data: format(new Date(t.data), 'yyyy-MM-dd'),
        descricao: t.descricao,
        categoria: t.categoria.nome,
        tipo: t.tipo as 'DESPESA' | 'INVESTIMENTO',
        valor: Number(t.valor),
      })),
    ].sort((a, b) => b.data.localeCompare(a.data)),
  }
}
