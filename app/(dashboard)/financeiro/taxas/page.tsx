import { getTenantDb } from '@/lib/prisma'
import { TaxasClient } from './client'

export default async function TaxasPage() {
  const db = getTenantDb()
  const taxas = await db.taxaImposto.findMany({ orderBy: [{ tipo: 'asc' }, { nome: 'asc' }] })
  return <TaxasClient taxas={taxas.map(t => ({ ...t, aliquota: t.aliquota ? Number(t.aliquota) : null, valorFixo: t.valorFixo ? Number(t.valorFixo) : null }))} />
}
