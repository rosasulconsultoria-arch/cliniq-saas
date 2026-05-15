import { db } from '@/lib/db'
import { CategoriaSection } from '@/components/financeiro/categoria-section'

export default async function CategoriasPage() {
  const categorias = await db.categoriaFinanceira.findMany({ orderBy: [{ tipo: 'asc' }, { nome: 'asc' }] })

  const receitas = categorias.filter(c => c.tipo === 'RECEITA')
  const despesas = categorias.filter(c => c.tipo === 'DESPESA')
  const investimentos = categorias.filter(c => c.tipo === 'INVESTIMENTO')

  return (
    <div className="space-y-8">
      <CategoriaSection tipo="RECEITA" categorias={receitas} />
      <CategoriaSection tipo="DESPESA" categorias={despesas} />
      <CategoriaSection tipo="INVESTIMENTO" categorias={investimentos} />
    </div>
  )
}
