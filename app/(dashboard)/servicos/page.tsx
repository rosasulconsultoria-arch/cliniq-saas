import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'
import { getCurrentTenant } from '@/lib/tenant-header'
import { auth } from '@/lib/auth'
import { seedServicosSeNecessario } from './actions'
import { ServicosClient } from './client'

export default async function ServicosPage() {
  await seedServicosSeNecessario()
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  const { id: tenantId } = await getCurrentTenant()
  const servicos = await runWithTenant(tenantId, async () => {
    const db = getTenantDb()
    return db.servico.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { agendamentos: true } } },
    })
  })

  return (
    <ServicosClient
      servicos={servicos.map(s => ({ ...s, _count: s._count }))}
      isAdmin={isAdmin}
    />
  )
}
