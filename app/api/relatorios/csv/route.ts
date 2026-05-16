import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getFaturamentoPorPeriodo,
  getFaturamentoPorProfissional,
  getFaturamentoPorSala,
  getDespesasPorCategoria,
  getDRE,
  getComissoesPorProfissional,
  getOcupacaoPorSala,
  getPacientesAtivos,
} from '@/lib/relatorios'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') ?? ''
  const inicio = searchParams.get('inicio') ?? ''
  const fim = searchParams.get('fim') ?? ''

  let csv = ''
  let filename = tipo

  try {
    switch (tipo) {
      case 'faturamento': {
        const dados = await getFaturamentoPorPeriodo(inicio, fim)
        const header = 'Data,Descrição,Categoria,Forma Pagamento,Valor,Status'
        const rows = dados.map(d => [
          format(d.data, 'dd/MM/yyyy'),
          `"${d.descricao}"`,
          d.categoria.nome,
          d.formaPagamento ?? '',
          d.valor.toFixed(2),
          d.status,
        ].join(','))
        csv = [header, ...rows].join('\n')
        break
      }
      case 'por-profissional': {
        const dados = await getFaturamentoPorProfissional(inicio, fim)
        csv = ['Profissional,Consultas,Faturamento',
          ...dados.map(d => [`"${d.profissional}"`, d.consultas, d.faturamento.toFixed(2)].join(','))
        ].join('\n')
        break
      }
      case 'por-sala': {
        const dados = await getFaturamentoPorSala(inicio, fim)
        csv = ['Sala,Consultas,Faturamento',
          ...dados.map(d => [`"${d.sala}"`, d.consultas, d.faturamento.toFixed(2)].join(','))
        ].join('\n')
        break
      }
      case 'despesas-categoria': {
        const dados = await getDespesasPorCategoria(inicio, fim)
        csv = ['Categoria,Total,Pago,Pendente',
          ...dados.map(d => [`"${d.nome}"`, d.total.toFixed(2), d.pago.toFixed(2), d.pendente.toFixed(2)].join(','))
        ].join('\n')
        break
      }
      case 'dre': {
        const d = await getDRE(inicio, fim)
        csv = [
          'Item,Valor',
          `Receitas,${d.receitas.toFixed(2)}`,
          `Despesas Operacionais,-${d.despesas.toFixed(2)}`,
          `Comissões Pagas,-${d.totalComissoes.toFixed(2)}`,
          `Receita de Aluguéis,${d.totalAlugueis.toFixed(2)}`,
          `Investimentos,-${d.investimentos.toFixed(2)}`,
          `Lucro Líquido,${d.lucro.toFixed(2)}`,
        ].join('\n')
        break
      }
      case 'comissoes': {
        const dados = await getComissoesPorProfissional(inicio, fim)
        csv = ['Profissional,Consultas,Total Comissão,Pago,Pendente',
          ...dados.map(d => [`"${d.nome}"`, d.count, d.total.toFixed(2), d.pago.toFixed(2), d.pendente.toFixed(2)].join(','))
        ].join('\n')
        break
      }
      case 'ocupacao': {
        const dados = await getOcupacaoPorSala(inicio, fim)
        csv = ['Sala,Agendamentos,Realizados,Slots Disponíveis,Taxa (%)',
          ...dados.map(d => [`"${d.sala}"`, d.agendado, d.realizado, d.slotsTotal, d.taxa.toFixed(1)].join(','))
        ].join('\n')
        break
      }
      case 'pacientes': {
        const d = await getPacientesAtivos()
        csv = [
          'Métrica,Valor',
          `Total de Cadastros,${d.totalCadastros}`,
          `Cadastros Ativos,${d.ativos}`,
          `Cadastros Inativos,${d.inativos}`,
          `Com consulta nos últimos 90 dias,${d.ativosRecentes}`,
          `Sem consulta há mais de 90 dias,${d.inativosLongos}`,
        ].join('\n')
        break
      }
      default:
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }
  } catch (e) {
    console.error('[csv-export]', e)
    return NextResponse.json({ error: 'Erro ao gerar CSV' }, { status: 500 })
  }

  const bom = '﻿'
  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  })
}
