'use server'

import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  token: z.string().min(1),
  novaSenha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmar: z.string(),
}).refine((d) => d.novaSenha === d.confirmar, {
  message: 'As senhas não coincidem',
  path: ['confirmar'],
})

export async function redefinirSenha(
  formData: { token: string; novaSenha: string; confirmar: string }
): Promise<{ success?: boolean; error?: string }> {
  const parsed = schema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const user = await db.user.findFirst({
    where: {
      resetToken: parsed.data.token,
      resetTokenExpiry: { gt: new Date() },
    },
  })

  if (!user) return { error: 'Link inválido ou expirado. Solicite um novo.' }

  const hash = await bcrypt.hash(parsed.data.novaSenha, 12)

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hash,
      resetToken: null,
      resetTokenExpiry: null,
      mustChangePassword: false,
    },
  })

  return { success: true }
}
