'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { revalidatePath } from 'next/cache'
import { SalaSchema } from '@/lib/schemas/sala'

export async function criarSala(data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = SalaSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
    const db = getTenantDb()
    try {
      await db.sala.create({ data: { ...parsed.data, descricao: parsed.data.descricao || null } })
      revalidatePath('/salas')
      return {}
    } catch (e: any) {
      // P2002: nome é @@unique([nome, tenantId]) — único dentro do tenant
      if (e?.code === 'P2002') return { error: 'Já existe uma sala com esse nome' }
      return { error: 'Erro ao criar sala.' }
    }
  })
}

export async function atualizarSala(id: string, data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = SalaSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
    const db = getTenantDb()
    try {
      await db.sala.update({
        where: { id },
        data: { ...parsed.data, descricao: parsed.data.descricao || null },
      })
      revalidatePath('/salas')
      revalidatePath(`/salas/${id}`)
      return {}
    } catch (e: any) {
      if (e?.code === 'P2002') return { error: 'Já existe uma sala com esse nome' }
      return { error: 'Erro ao atualizar sala.' }
    }
  })
}

export async function deletarSala(id: string): Promise<void> {
  return withTenantAction(async () => {
    const db = getTenantDb()
    await db.sala.delete({ where: { id } })
    revalidatePath('/salas')
  })
}
