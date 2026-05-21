import { getTenantDb } from '@/lib/prisma'
import { TemplatesClient } from './client'

export default async function TemplatesPage() {
  const db = getTenantDb()
  const templates = await db.crmTemplate.findMany({ orderBy: { createdAt: 'desc' } })
  return <TemplatesClient templates={templates.map(t => ({ ...t, createdAt: undefined }))} />
}
