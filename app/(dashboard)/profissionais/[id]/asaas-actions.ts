'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function salvarAsaasApiKey(
  profissionalId: string,
  apiKey: string
): Promise<{ success?: boolean; error?: string }> {
  return withTenantAction(async () => {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') return { error: 'Acesso não autorizado' }

    const db = getTenantDb()
    await db.profissional.update({
      where: { id: profissionalId },
      data: { asaasApiKey: apiKey || null },
    })

    revalidatePath('/agenda')
    return { success: true }
  })
}
