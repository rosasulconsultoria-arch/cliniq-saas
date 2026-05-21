import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { getTenantDb } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TransacaoForm } from '@/components/financeiro/transacao-form'

interface Props {
  params: { id: string }
}

export default async function EditarTransacaoPage({ params }: Props) {
  const db = getTenantDb()
  const transacao = await db.transacaoFinanceira.findUnique({ where: { id: params.id } })
  if (!transacao) notFound()

  const tipo = transacao.tipo as 'RECEITA' | 'DESPESA' | 'INVESTIMENTO'
  const backHref = tipo === 'RECEITA' ? '/financeiro/receitas' : tipo === 'DESPESA' ? '/financeiro/despesas' : '/financeiro/investimentos'

  const [categorias, profissionais] = await Promise.all([
    db.categoriaFinanceira.findMany({ orderBy: [{ tipo: 'asc' }, { nome: 'asc' }] }),
    db.profissional.findMany({ where: { ativo: true }, include: { user: { select: { name: true } } }, orderBy: { user: { name: 'asc' } } }),
  ])

  const defaultValues = {
    tipo,
    categoriaId: transacao.categoriaId,
    descricao: transacao.descricao,
    valor: Number(transacao.valor),
    data: format(transacao.data, 'yyyy-MM-dd'),
    formaPagamento: transacao.formaPagamento ?? undefined,
    status: transacao.status as 'PENDENTE' | 'PAGO',
    dataPagamento: transacao.dataPagamento ? format(transacao.dataPagamento, 'yyyy-MM-dd') : null,
    profissionalId: transacao.profissionalId,
    observacoes: transacao.observacoes ?? undefined,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={backHref}><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Editar Transação</h1>
          <p className="text-sm text-muted-foreground truncate">{transacao.descricao}</p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <TransacaoForm
            defaultValues={defaultValues}
            categorias={categorias}
            profissionais={profissionais.map(p => ({ id: p.id, nome: p.user.name }))}
            isEdit
            id={params.id}
          />
        </CardContent>
      </Card>
    </div>
  )
}
