import { db } from '@/lib/db'
import { CampanhasClient } from './client'

export default async function CampanhasPage() {
  const [campanhas, templates, servicos] = await Promise.all([
    db.crmCampanha.findMany({ orderBy: { criadaEm: 'desc' } }),
    db.crmTemplate.findMany({ where: { ativo: true }, orderBy: { titulo: 'asc' } }),
    db.servico.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
  ])
  return (
    <CampanhasClient
      campanhas={campanhas.map(c => ({ ...c, criadaEm: c.criadaEm.toISOString() }))}
      templates={templates}
      servicos={servicos}
    />
  )
}
