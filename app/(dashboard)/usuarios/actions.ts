'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { revalidatePath } from 'next/cache'
import { UsuarioSchema } from '@/lib/schemas/usuario'
import { assertAdmin } from '@/lib/auth-guard'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function criarUsuario(data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    await assertAdmin()
    const parsed = UsuarioSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

    const { name, email, password, role, active } = parsed.data
    if (!password) return { error: 'Senha é obrigatória' }

    const db = getTenantDb()
    try {
      const hash = await bcrypt.hash(password, 12)
      await db.user.create({ data: { name, email, passwordHash: hash, role, active: active ?? true } })
      revalidatePath('/usuarios')
      return {}
    } catch (e: any) {
      // P2002: email é @@unique([email, tenantId]) — único dentro do tenant
      if (e?.code === 'P2002') return { error: 'Email já cadastrado' }
      return { error: 'Erro ao criar usuário.' }
    }
  })
}

export async function atualizarUsuario(id: string, data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = UsuarioSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

    const { name, email, password, role, active } = parsed.data
    const db = getTenantDb()
    try {
      const updateData: Record<string, unknown> = { name, email, role, active }
      if (password) updateData.passwordHash = await bcrypt.hash(password, 12)

      await db.user.update({ where: { id }, data: updateData })
      revalidatePath('/usuarios')
      revalidatePath(`/usuarios/${id}`)
      return {}
    } catch (e: any) {
      if (e?.code === 'P2002') return { error: 'Email já cadastrado' }
      return { error: 'Erro ao atualizar usuário.' }
    }
  })
}

export async function deletarUsuario(id: string): Promise<void> {
  return withTenantAction(async () => {
    await assertAdmin()
    const session = await auth()
    if (session?.user?.id === id) throw new Error('Você não pode excluir sua própria conta')
    const db = getTenantDb()
    await db.user.delete({ where: { id } })
    revalidatePath('/usuarios')
  })
}

export async function toggleAtivo(id: string, active: boolean): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const session = await auth()
    if (session?.user?.id === id) return { error: 'Você não pode desativar sua própria conta' }
    const db = getTenantDb()
    try {
      await db.user.update({ where: { id }, data: { active } })
      revalidatePath('/usuarios')
      return {}
    } catch {
      return { error: 'Erro ao alterar status.' }
    }
  })
}
