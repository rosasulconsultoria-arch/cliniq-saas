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
        cpf: cpf.replace(/\D/g, ''),
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
        cpf: cpf.replace(/\D/g, ''),
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

export async function deletarPaciente(id: string): Promise<void> {
  await db.paciente.delete({ where: { id } })
  revalidatePath('/pacientes')
}
