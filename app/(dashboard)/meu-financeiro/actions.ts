'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { DespesaProfissionalSchema } from '@/lib/schemas/despesa-profissional'

async function getProfissionalId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  // Chamado sempre de dentro de withTenantAction — contexto de tenant disponível
  const db = getTenantDb()
  const prof = await db.profissional.findUnique({ where: { userId: session.user.id } })
  return prof?.id ?? null
}

export async function criarDespesa(data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const profissionalId = await getProfissionalId()
    if (!profissionalId) return { error: 'Profissional não encontrado' }

    const parsed = DespesaProfissionalSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

    const { descricao, valor, data: dataStr, categoria, status, observacao } = parsed.data
    const db = getTenantDb()
    try {
      await db.despesaProfissional.create({
        data: {
          profissionalId,
          descricao,
          valor,
          data: new Date(dataStr),
          categoria,
          status,
          observacao: observacao || null,
        },
      })
      revalidatePath('/meu-financeiro')
      return {}
    } catch (e) {
      console.error(e)
      return { error: 'Erro ao salvar despesa.' }
    }
  })
}

export async function atualizarDespesa(id: string, data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const profissionalId = await getProfissionalId()
    if (!profissionalId) return { error: 'Profissional não encontrado' }

    const parsed = DespesaProfissionalSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

    const { descricao, valor, data: dataStr, categoria, status, observacao } = parsed.data
    const db = getTenantDb()
    try {
      await db.despesaProfissional.updateMany({
        where: { id, profissionalId },
        data: { descricao, valor, data: new Date(dataStr), categoria, status, observacao: observacao || null },
      })
      revalidatePath('/meu-financeiro')
      return {}
    } catch (e) {
      return { error: 'Erro ao atualizar despesa.' }
    }
  })
}

export async function deletarDespesa(id: string): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const profissionalId = await getProfissionalId()
    if (!profissionalId) return { error: 'Profissional não encontrado' }

    const db = getTenantDb()
    await db.despesaProfissional.deleteMany({ where: { id, profissionalId } })
    revalidatePath('/meu-financeiro')
    return {}
  })
}

export async function marcarDespesaPaga(id: string, formaPagamento: string): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const profissionalId = await getProfissionalId()
    if (!profissionalId) return { error: 'Profissional não encontrado' }

    const db = getTenantDb()
    await db.despesaProfissional.updateMany({
      where: { id, profissionalId },
      data: { status: 'PAGO', formaPagamento, dataPagamento: new Date() },
    })
    revalidatePath('/meu-financeiro')
    return {}
  })
}

export async function marcarAluguelPago(id: string, formaPagamento: string): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const profissionalId = await getProfissionalId()
    if (!profissionalId) return { error: 'Profissional não encontrado' }

    const db = getTenantDb()
    await db.aluguel.updateMany({
      where: { id, profissionalId },
      data: { status: 'PAGO', formaPagamento, dataPagamento: new Date() },
    })
    revalidatePath('/meu-financeiro')
    return {}
  })
}

export async function marcarComissaoPaga(id: string, formaPagamento: string): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const profissionalId = await getProfissionalId()
    if (!profissionalId) return { error: 'Profissional não encontrado' }

    const db = getTenantDb()
    await db.comissao.updateMany({
      where: { id, profissionalId },
      data: { status: 'PAGO', formaPagamento, dataPagamento: new Date() },
    })
    revalidatePath('/meu-financeiro')
    return {}
  })
}
