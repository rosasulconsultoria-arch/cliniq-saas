'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { PacienteSchema } from '@/lib/schemas/paciente'

export async function criarPaciente(data: unknown): Promise<{ error?: string }> {
  const parsed = PacienteSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { cpf, dataNascimento, email, telefone, ...rest } = parsed.data
  try {
    await db.paciente.create({
      data: {
        ...rest,
        cpf: cpf ? cpf.replace(/\D/g, '') || null : null,
        email: email || null,
        telefone: telefone || null,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      },
    })
    revalidatePath('/pacientes')
    return {}
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'CPF já cadastrado' }
    return { error: 'Erro ao criar paciente.' }
  }
}

export async function atualizarPaciente(id: string, data: unknown): Promise<{ error?: string }> {
  const parsed = PacienteSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { cpf, dataNascimento, email, telefone, ...rest } = parsed.data
  try {
    await db.paciente.update({
      where: { id },
      data: {
        ...rest,
        cpf: cpf ? cpf.replace(/\D/g, '') || null : null,
        email: email || null,
        telefone: telefone || null,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
      },
    })
    revalidatePath('/pacientes')
    revalidatePath(`/pacientes/${id}`)
    return {}
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: 'CPF já cadastrado' }
    return { error: 'Erro ao atualizar paciente.' }
  }
}

export async function criarPacienteRapido(
  data: { nome: string; telefone: string }
): Promise<{ id: string; nome: string; cpf: string | null } | { error: string }> {
  if (!data.nome?.trim() || !data.telefone?.trim()) return { error: 'Nome e telefone são obrigatórios' }
  try {
    const paciente = await db.paciente.create({
      data: { nome: data.nome.trim(), telefone: data.telefone.trim(), ativo: true },
      select: { id: true, nome: true, cpf: true },
    })
    revalidatePath('/pacientes')
    return { id: paciente.id, nome: paciente.nome, cpf: paciente.cpf }
  } catch {
    return { error: 'Erro ao cadastrar paciente.' }
  }
}

export async function deletarPaciente(id: string): Promise<void> {
  await db.paciente.delete({ where: { id } })
  revalidatePath('/pacientes')
}
