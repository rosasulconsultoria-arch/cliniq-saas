'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function salvarAsaasApiKey(
  profissionalId: string,
  apiKey: string
): Promise<{ success?: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') return { error: 'Acesso não autorizado' }

  await db.profissional.update({
    where: { id: profissionalId },
    data: { asaasApiKey: apiKey || null },
  })

  revalidatePath('/agenda')

  return { success: true }
}
