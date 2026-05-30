import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'
import { getCurrentTenant } from '@/lib/tenant-header'
import { TemplatesClient } from './client'

export default async function TemplatesPage() {
  const { id: tenantId } = await getCurrentTenant()
  const templates = await runWithTenant(tenantId, async () => {
    const db = getTenantDb()
    return db.crmTemplate.findMany({ orderBy: { createdAt: 'desc' } })
  })
  return <TemplatesClient templates={templates.map(t => ({ ...t, createdAt: undefined }))} />
}
