'use server'

import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { enviarEmailRecuperacaoSenha } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

export async function solicitarRecuperacaoSenha(
  formData: { email: string }
): Promise<{ success?: boolean; error?: string }> {
  const parsed = schema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } })

  // Sempre retorna sucesso para não revelar se o e-mail existe
  if (!user || !user.active) return { success: true }

  const token = randomBytes(32).toString('hex')
  const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

  await db.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  })

  await enviarEmailRecuperacaoSenha({ email: user.email, nome: user.name, token })

  return { success: true }
}
