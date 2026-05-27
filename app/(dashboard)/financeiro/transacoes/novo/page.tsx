import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getTenantDb } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TransacaoForm } from '@/components/financeiro/transacao-form'
import { getSearchParam } from '@/lib/utils'

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const TIPO_LABELS = { RECEITA: 'Nova Receita', DESPESA: 'Nova Despesa', INVESTIMENTO: 'Novo Investimento' }

export default async function NovaTransacaoPage(props: Props) {
  const searchParams = await props.searchParams;
  const tipoParam = getSearchParam(searchParams.tipo) as 'RECEITA' | 'DESPESA' | 'INVESTIMENTO' | ''
  const tipo = ['RECEITA', 'DESPESA', 'INVESTIMENTO'].includes(tipoParam) ? tipoParam as 'RECEITA' | 'DESPESA' | 'INVESTIMENTO' : 'RECEITA'

  const backHref = tipo === 'RECEITA' ? '/financeiro/receitas' : tipo === 'DESPESA' ? '/financeiro/despesas' : '/financeiro/investimentos'

  const db = getTenantDb()
  const [categorias, profissionais] = await Promise.all([
    db.categoriaFinanceira.findMany({ orderBy: [{ tipo: 'asc' }, { nome: 'asc' }] }),
    db.profissional.findMany({ where: { ativo: true }, include: { user: { select: { name: true } } }, orderBy: { user: { name: 'asc' } } }),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{TIPO_LABELS[tipo]}</h1>
          <p className="text-sm text-muted-foreground">Campos marcados com * são obrigatórios</p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <TransacaoForm
            tipoInicial={tipo}
            categorias={categorias}
            profissionais={profissionais.map(p => ({ id: p.id, nome: p.user.name }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
