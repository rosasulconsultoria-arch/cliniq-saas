'use server'

import { randomBytes } from 'crypto'
import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { enviarEmailRecuperacaoSenha } from '@/lib/email'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
})

export async function solicitarRecuperacaoSenha(
  formData: { email: string }
): Promise<{ success?: boolean; error?: string }> {
  return withTenantAction(async () => {
    const parsed = schema.safeParse(formData)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

    const db = getTenantDb()
    // email é @@unique([email, tenantId]) — busca por findFirst com tenantId injetado pela extension
    const user = await db.user.findFirst({ where: { email: parsed.data.email } })

    // Sempre retorna sucesso para não revelar se o e-mail existe
    if (!user || !user.active) return { success: true }

    const token = randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000)

    await db.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    })

    await enviarEmailRecuperacaoSenha({ email: user.email, nome: user.name, token })

    return { success: true }
  })
}
