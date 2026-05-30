import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'
import { getCurrentTenant } from '@/lib/tenant-header'
import { CampanhasClient } from './client'

export default async function CampanhasPage() {
  const { id: tenantId } = await getCurrentTenant()
  const [campanhas, templates, servicos] = await runWithTenant(tenantId, async () => {
    const db = getTenantDb()
    return Promise.all([
      db.crmCampanha.findMany({ orderBy: { criadaEm: 'desc' } }),
      db.crmTemplate.findMany({ where: { ativo: true }, orderBy: { titulo: 'asc' } }),
      db.servico.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    ])
  })
  return (
    <CampanhasClient
      campanhas={campanhas.map(c => ({ ...c, criadaEm: c.criadaEm.toISOString() }))}
      templates={templates}
      servicos={servicos}
    />
  )
}
