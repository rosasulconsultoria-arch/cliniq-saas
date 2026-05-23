'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { revalidatePath } from 'next/cache'
import { LocalSchema } from '@/lib/schemas/local'
import { db } from '@/lib/db'
import { getTenantId } from '@/lib/tenant-context'
import { checkLimit } from '@/lib/plans'

export async function criarLocal(data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = LocalSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
    const tenantId = getTenantId()
    const tenantDb = getTenantDb()
    const [tenant, count] = await Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, select: { plano: true } }),
      tenantDb.local.count(),
    ])
    const check = checkLimit(tenant!.plano, 'locais', count)
    if (!check.allowed) return { error: check.message }
    try {
      await tenantDb.local.create({
        data: {
          ...parsed.data,
          descricao:   parsed.data.descricao  || null,
          endereco:    parsed.data.endereco   || null,
          plataforma:  parsed.data.plataforma || null,
          linkPadrao:  parsed.data.linkPadrao || null,
          instrucoes:  parsed.data.instrucoes || null,
        },
      })
      revalidatePath('/locais')
      return {}
    } catch (e: any) {
      if (e?.code === 'P2002') return { error: 'Já existe um local com esse nome' }
      return { error: 'Erro ao criar local.' }
    }
  })
}

export async function atualizarLocal(id: string, data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = LocalSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
    const db = getTenantDb()
    try {
      await db.local.update({
        where: { id },
        data: {
          ...parsed.data,
          descricao:   parsed.data.descricao  || null,
          endereco:    parsed.data.endereco   || null,
          plataforma:  parsed.data.plataforma || null,
          linkPadrao:  parsed.data.linkPadrao || null,
          instrucoes:  parsed.data.instrucoes || null,
        },
      })
      revalidatePath('/locais')
      revalidatePath(`/locais/${id}`)
      return {}
    } catch (e: any) {
      if (e?.code === 'P2002') return { error: 'Já existe um local com esse nome' }
      return { error: 'Erro ao atualizar local.' }
    }
  })
}

export async function deletarLocal(id: string): Promise<void> {
  return withTenantAction(async () => {
    const db = getTenantDb()
    await db.local.delete({ where: { id } })
    revalidatePath('/locais')
  })
}
