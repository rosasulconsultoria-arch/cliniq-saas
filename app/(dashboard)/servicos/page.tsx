import { getTenantDb } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { seedServicosSeNecessario } from './actions'
import { ServicosClient } from './client'

export default async function ServicosPage() {
  await seedServicosSeNecessario()
  const session = await auth()
  const isAdmin = session?.user?.role === 'ADMIN'

  const db = getTenantDb()
  const servicos = await db.servico.findMany({
    orderBy: { nome: 'asc' },
    include: { _count: { select: { agendamentos: true } } },
  })

  return (
    <ServicosClient
      servicos={servicos.map(s => ({ ...s, _count: s._count }))}
      isAdmin={isAdmin}
    />
  )
}
