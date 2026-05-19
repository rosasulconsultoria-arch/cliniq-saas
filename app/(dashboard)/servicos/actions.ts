'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const DEFAULTS = [
  'Avaliação Neuropsicológica',
  'Intervenção',
  'THS',
  'Arteterapia',
  'Tutoria em Matemática',
]

export async function seedServicosSeNecessario() {
  const count = await db.servico.count()
  if (count === 0) {
    await db.servico.createMany({ data: DEFAULTS.map(nome => ({ nome })) })
  }
}

const ServicoSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
})

export async function criarServico(data: unknown): Promise<{ error?: string }> {
  const parsed = ServicoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  try {
    await db.servico.create({ data: parsed.data })
    revalidatePath('/servicos')
    return {}
  } catch {
    return { error: 'Nome já cadastrado ou erro ao criar.' }
  }
}

export async function atualizarServico(id: string, data: unknown): Promise<{ error?: string }> {
  const parsed = ServicoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  try {
    await db.servico.update({ where: { id }, data: parsed.data })
    revalidatePath('/servicos')
    return {}
  } catch {
    return { error: 'Erro ao atualizar.' }
  }
}

export async function deletarServico(id: string): Promise<{ error?: string }> {
  try {
    await db.servico.delete({ where: { id } })
    revalidatePath('/servicos')
    return {}
  } catch {
    return { error: 'Serviço possui agendamentos vinculados.' }
  }
}

export async function getServicosAtivos() {
  return db.servico.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } })
}
