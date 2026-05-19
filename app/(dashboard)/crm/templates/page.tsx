import { db } from '@/lib/db'
import { TemplatesClient } from './client'

export default async function TemplatesPage() {
  const templates = await db.crmTemplate.findMany({ orderBy: { createdAt: 'desc' } })
  return <TemplatesClient templates={templates} />
}
