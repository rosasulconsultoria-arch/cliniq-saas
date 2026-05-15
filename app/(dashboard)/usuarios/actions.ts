'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { UsuarioSchema } from '@/lib/schemas/usuario'
import { assertAdmin } from '@/lib/auth-guard'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function criarUsuario(data: unknown): Promise<{ error?: string }> {
  await assertAdmin()
  const parsed = UsuarioSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { name, email, password, role, active } = parsed.data
  if (!password) return { error: 'Senha é obrigatória' }

  try {
    const hash = await bcrypt.hash(password, 12)
    await db.user.create({ data: { name, email, passwordHash: hash, role, active: active ?? true } })
    revalidatePath('/usuarios')
    return {}
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'Email já cadastrado' }
    return { error: 'Erro ao criar usuário.' }
  }
}

export async function atualizarUsuario(id: string, data: unknown): Promise<{ error?: string }> {
  const parsed = UsuarioSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { name, email, password, role, active } = parsed.data

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
}

export async function deletarUsuario(id: string): Promise<void> {
  await assertAdmin()
  const session = await auth()
  if (session?.user?.id === id) throw new Error('Você não pode excluir sua própria conta')
  await db.user.delete({ where: { id } })
  revalidatePath('/usuarios')
}

export async function toggleAtivo(id: string, active: boolean): Promise<{ error?: string }> {
  const session = await auth()
  if (session?.user?.id === id) return { error: 'Você não pode desativar sua própria conta' }
  try {
    await db.user.update({ where: { id }, data: { active } })
    revalidatePath('/usuarios')
    return {}
  } catch {
    return { error: 'Erro ao alterar status.' }
  }
}
