'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  novaSenha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmar: z.string(),
}).refine((d) => d.novaSenha === d.confirmar, {
  message: 'As senhas não coincidem',
  path: ['confirmar'],
})

export async function trocarSenha(
  formData: { novaSenha: string; confirmar: string }
): Promise<{ error?: string; success?: boolean }> {
  return withTenantAction(async () => {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Não autenticado' }

    const parsed = schema.safeParse(formData)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

    const db = getTenantDb()
    const hash = await bcrypt.hash(parsed.data.novaSenha, 12)

    await db.user.update({
      where: { id: session.user.id },
      data: { passwordHash: hash, mustChangePassword: false },
    })

    return { success: true }
  })
}
