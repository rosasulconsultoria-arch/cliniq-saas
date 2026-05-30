import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'
import { getCurrentTenant } from '@/lib/tenant-header'
import { TaxasClient } from './client'

export default async function TaxasPage() {
  const { id: tenantId } = await getCurrentTenant()
  const taxas = await runWithTenant(tenantId, async () => {
    const db = getTenantDb()
    return db.taxaImposto.findMany({ orderBy: [{ tipo: 'asc' }, { nome: 'asc' }] })
  })
  return <TaxasClient taxas={taxas.map(t => ({ ...t, aliquota: t.aliquota ? Number(t.aliquota) : null, valorFixo: t.valorFixo ? Number(t.valorFixo) : null }))} />
}
