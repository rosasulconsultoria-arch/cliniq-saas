import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { auth } from '@/lib/auth'
import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import {
  getFaturamentoPorPeriodo, getFaturamentoPorProfissional, getFaturamentoPorLocal,
  getDespesasPorCategoria, getDRE, getComissoesPorProfissional,
  getOcupacaoPorLocal, getPacientesAtivos,
} from '@/lib/relatorios'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RelatorioPDF } from '@/components/pdf/relatorio-pdf'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const LABELS: Record<string, string> = {
  faturamento: 'Faturamento por Período',
  'por-profissional': 'Faturamento por Profissional',
  'por-local': 'Faturamento por Local',
  'despesas-categoria': 'Despesas por Categoria',
  dre: 'DRE — Demonstrativo de Resultado',
  comissoes: 'Comissões por Profissional',
  ocupacao: 'Ocupação por Local',
  pacientes: 'Relatório de Pacientes',
}

function brl(v: number) { return `R$ ${v.toFixed(2).replace('.', ',')}` }

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Não autorizado', { status: 401 })

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') ?? ''
  const inicio = searchParams.get('inicio') ?? ''
  const fim = searchParams.get('fim') ?? ''

  return withTenantAction(async () => {
    let headers: string[] = []
    let rows: string[][] = []

    try {
      switch (tipo) {
        case 'faturamento': {
          const d = await getFaturamentoPorPeriodo(inicio, fim)
          headers = ['Data', 'Descrição', 'Categoria', 'Forma Pagamento', 'Valor', 'Status']
          rows = d.map(r => [format(r.data, 'dd/MM/yyyy'), r.descricao, r.categoria.nome, r.formaPagamento ?? '', brl(r.valor), r.status])
          break
        }
        case 'por-profissional': {
          const d = await getFaturamentoPorProfissional(inicio, fim)
          headers = ['Profissional', 'Consultas', 'Faturamento']
          rows = d.map(r => [r.profissional, String(r.consultas), brl(r.faturamento)])
          break
        }
        case 'por-local': {
          const d = await getFaturamentoPorLocal(inicio, fim)
          headers = ['Local', 'Consultas', 'Faturamento']
          rows = d.map(r => [r.local, String(r.consultas), brl(r.faturamento)])
          break
        }
        case 'despesas-categoria': {
          const d = await getDespesasPorCategoria(inicio, fim)
          headers = ['Categoria', 'Total', 'Pago', 'Pendente']
          rows = d.map(r => [r.nome, brl(r.total), brl(r.pago), brl(r.pendente)])
          break
        }
        case 'dre': {
          const d = await getDRE(inicio, fim)
          headers = ['Item', 'Valor']
          rows = [
            ['Receitas Operacionais', brl(d.receitas)],
            ['(−) Despesas Operacionais', brl(-d.despesas)],
            ['(+) Comissões Recebidas', brl(d.totalComissoes)],
            ['(+) Receita de Aluguéis', brl(d.totalAlugueis)],
            ['(−) Investimentos', brl(-d.investimentos)],
            ['Lucro Líquido', brl(d.lucro)],
          ]
          break
        }
        case 'comissoes': {
          const d = await getComissoesPorProfissional(inicio, fim)
          headers = ['Profissional', 'Consultas', 'Total Comissão', 'Pago', 'Pendente']
          rows = d.map(r => [r.nome, String(r.count), brl(r.total), brl(r.pago), brl(r.pendente)])
          break
        }
        case 'ocupacao': {
          const d = await getOcupacaoPorLocal(inicio, fim)
          headers = ['Local', 'Agendamentos', 'Realizados', 'Slots Disponíveis', 'Taxa (%)']
          rows = d.map(r => [r.local, String(r.agendado), String(r.realizado), String(r.slotsTotal), `${r.taxa.toFixed(1)}%`])
          break
        }
        case 'pacientes': {
          const d = await getPacientesAtivos()
          headers = ['Métrica', 'Valor']
          rows = [
            ['Total de Cadastros', String(d.totalCadastros)],
            ['Cadastros Ativos', String(d.ativos)],
            ['Cadastros Inativos', String(d.inativos)],
            ['Com consulta nos últimos 90 dias', String(d.ativosRecentes)],
            ['Sem consulta há mais de 90 dias', String(d.inativosLongos)],
          ]
          break
        }
        default:
          return new Response('Tipo inválido', { status: 400 })
      }
    } catch (e) {
      console.error('[pdf-export]', e)
      return new Response('Erro ao gerar PDF', { status: 500 })
    }

    const config = await getTenantDb().configClinica.findFirst({ orderBy: { updatedAt: 'desc' } })
    const clinicaNome = config?.nome ?? 'Clínica de Psicologia'
    const title = LABELS[tipo] ?? tipo
    const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

    const pdf = createElement(RelatorioPDF, { title, headers, rows, generatedAt: now, clinicaNome })
    const buffer = await renderToBuffer(pdf)

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${tipo}-${format(new Date(), 'yyyy-MM-dd')}.pdf"`,
      },
    })
  })
}
