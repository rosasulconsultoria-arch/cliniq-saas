import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { withTenantAction } from '@/lib/with-tenant-action'
import {
  getFaturamentoPorPeriodo,
  getFaturamentoPorProfissional,
  getFaturamentoPorLocal,
  getDespesasPorCategoria,
  getDRE,
  getComissoesPorProfissional,
  getOcupacaoPorLocal,
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

  return withTenantAction(async () => {
    let csv = ''
    const filename = tipo

    try {
      const sep = (v: number) => v.toFixed(2).replace('.', ',')
      const row = (...cols: (string | number)[]) => cols.map(c => typeof c === 'string' && c.includes(';') ? `"${c}"` : c).join(';')

      switch (tipo) {
        case 'faturamento': {
          const dados = await getFaturamentoPorPeriodo(inicio, fim)
          csv = [
            row('Data', 'Descrição', 'Categoria', 'Forma Pagamento', 'Valor', 'Status'),
            ...dados.map(d => row(
              format(d.data, 'dd/MM/yyyy'),
              d.descricao,
              d.categoria.nome,
              d.formaPagamento ?? '',
              sep(d.valor),
              d.status,
            )),
          ].join('\n')
          break
        }
        case 'por-profissional': {
          const dados = await getFaturamentoPorProfissional(inicio, fim)
          csv = [
            row('Profissional', 'Consultas', 'Faturamento'),
            ...dados.map(d => row(d.profissional, d.consultas, sep(d.faturamento))),
          ].join('\n')
          break
        }
        case 'por-local': {
          const dados = await getFaturamentoPorLocal(inicio, fim)
          csv = [
            row('Local', 'Consultas', 'Faturamento'),
            ...dados.map(d => row(d.local, d.consultas, sep(d.faturamento))),
          ].join('\n')
          break
        }
        case 'despesas-categoria': {
          const dados = await getDespesasPorCategoria(inicio, fim)
          csv = [
            row('Categoria', 'Total', 'Pago', 'Pendente'),
            ...dados.map(d => row(d.nome, sep(d.total), sep(d.pago), sep(d.pendente))),
          ].join('\n')
          break
        }
        case 'dre': {
          const d = await getDRE(inicio, fim)
          csv = [
            row('Item', 'Valor'),
            row('Receitas Operacionais', sep(d.receitas)),
            row('Despesas Operacionais', sep(-d.despesas)),
            row('Comissões Pagas', sep(-d.totalComissoes)),
            row('Receita de Aluguéis', sep(d.totalAlugueis)),
            row('Investimentos', sep(-d.investimentos)),
            row('Lucro Líquido', sep(d.lucro)),
          ].join('\n')
          break
        }
        case 'comissoes': {
          const dados = await getComissoesPorProfissional(inicio, fim)
          csv = [
            row('Profissional', 'Consultas', 'Total Comissão', 'Pago', 'Pendente'),
            ...dados.map(d => row(d.nome, d.count, sep(d.total), sep(d.pago), sep(d.pendente))),
          ].join('\n')
          break
        }
        case 'ocupacao': {
          const dados = await getOcupacaoPorLocal(inicio, fim)
          csv = [
            row('Local', 'Agendamentos', 'Realizados', 'Slots Disponíveis', 'Taxa (%)'),
            ...dados.map(d => row(d.local, d.agendado, d.realizado, d.slotsTotal, d.taxa.toFixed(1).replace('.', ','))),
          ].join('\n')
          break
        }
        case 'pacientes': {
          const d = await getPacientesAtivos()
          csv = [
            row('Métrica', 'Valor'),
            row('Total de Cadastros', d.totalCadastros),
            row('Cadastros Ativos', d.ativos),
            row('Cadastros Inativos', d.inativos),
            row('Com consulta nos últimos 90 dias', d.ativosRecentes),
            row('Sem consulta há mais de 90 dias', d.inativosLongos),
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
    return new Response(bom + 'sep=;\n' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  })
}
