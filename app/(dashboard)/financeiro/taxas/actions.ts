'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const TaxaSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  tipo: z.enum(['MUNICIPAL', 'FEDERAL', 'ESTADUAL']),
  aliquota: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).max(100).optional(),
  ),
  valorFixo: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).optional(),
  ),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
})

export type TaxaFormData = z.infer<typeof TaxaSchema>

export async function criarTaxa(data: unknown): Promise<{ error?: string }> {
  const parsed = TaxaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  try {
    await db.taxaImposto.create({ data: parsed.data })
    revalidatePath('/financeiro/taxas')
    return {}
  } catch {
    return { error: 'Erro ao criar taxa.' }
  }
}

export async function atualizarTaxa(id: string, data: unknown): Promise<{ error?: string }> {
  const parsed = TaxaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  try {
    await db.taxaImposto.update({ where: { id }, data: parsed.data })
    revalidatePath('/financeiro/taxas')
    return {}
  } catch {
    return { error: 'Erro ao atualizar taxa.' }
  }
}

export async function deletarTaxa(id: string): Promise<{ error?: string }> {
  try {
    await db.taxaImposto.delete({ where: { id } })
    revalidatePath('/financeiro/taxas')
    return {}
  } catch {
    return { error: 'Erro ao excluir taxa.' }
  }
}

export async function toggleTaxa(id: string, ativo: boolean): Promise<{ error?: string }> {
  try {
    await db.taxaImposto.update({ where: { id }, data: { ativo } })
    revalidatePath('/financeiro/taxas')
    return {}
  } catch {
    return { error: 'Erro ao atualizar status.' }
  }
}
