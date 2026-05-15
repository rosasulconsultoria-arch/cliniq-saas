'use server'

import { db } from '@/lib/db'
import { getHorariosDisponiveis, getSalaDisponivel } from '@/lib/agendamento'
import { criarTokenCancelamento } from '@/lib/tokens'
import { enviarEmailConfirmacao } from '@/lib/email'
import { validarCPF, mascaraCPF } from '@/lib/utils'
import { z } from 'zod'

export async function getHorariosAction(profissionalId: string, data: string) {
  return getHorariosDisponiveis(profissionalId, data)
}

export async function buscarPacientePorCPF(cpf: string) {
  const nums = cpf.replace(/\D/g, '')
  if (nums.length !== 11 || !validarCPF(nums)) return null
  return db.paciente.findUnique({
    where: { cpf: nums },
    select: { id: true, nome: true, telefone: true, email: true, dataNascimento: true },
  })
}

const PacientePublicoSchema = z.object({
  cpf: z.string().refine((v) => validarCPF(v.replace(/\D/g, '')), 'CPF inválido'),
  nome: z.string().min(2, 'Nome obrigatório'),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  dataNascimento: z.string().optional(),
})

export async function agendarPublico({
  profissionalId,
  data,
  horario,
  pacienteData,
}: {
  profissionalId: string
  data: string // 'YYYY-MM-DD'
  horario: string // 'HH:mm'
  pacienteData: unknown
}): Promise<{ error?: string; agendamentoId?: string }> {
  const pacienteParsed = PacientePublicoSchema.safeParse(pacienteData)
  if (!pacienteParsed.success) {
    return { error: pacienteParsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const [ano, mes, dia] = data.split('-').map(Number)
  const [h, m] = horario.split(':').map(Number)
  const inicio = new Date(ano, mes - 1, dia, h, m, 0)
  const fim = new Date(inicio.getTime() + 50 * 60_000)

  // Double-check slot is still available
  const slotsDisponiveis = await getHorariosDisponiveis(profissionalId, data)
  if (!slotsDisponiveis.includes(horario)) {
    return { error: 'Este horário não está mais disponível. Por favor, escolha outro.' }
  }

  // Find available sala
  const salaId = await getSalaDisponivel(inicio, fim)
  if (!salaId) {
    return { error: 'Não há salas disponíveis neste horário. Tente outro horário.' }
  }

  const cpf = pacienteParsed.data.cpf.replace(/\D/g, '')
  const { nome, telefone, email, dataNascimento } = pacienteParsed.data

  // Get profissional valor padrão
  const profissional = await db.profissional.findUnique({
    where: { id: profissionalId },
    include: { user: { select: { name: true } } },
  })

  try {
    // Upsert paciente
    let paciente = await db.paciente.findUnique({ where: { cpf } })

    if (!paciente) {
      paciente = await db.paciente.create({
        data: {
          cpf,
          nome,
          telefone: telefone || null,
          email: email || null,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
          ativo: true,
        },
      })
    } else {
      paciente = await db.paciente.update({
        where: { id: paciente.id },
        data: {
          nome,
          telefone: telefone || paciente.telefone,
          email: email || paciente.email,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : paciente.dataNascimento,
        },
      })
    }

    const agendamento = await db.agendamento.create({
      data: {
        profissionalId,
        pacienteId: paciente.id,
        salaId,
        dataHoraInicio: inicio,
        dataHoraFim: fim,
        status: 'AGENDADO',
        valor: profissional?.valorConsultaPadrao ?? 0,
        origem: 'PUBLICO',
      },
    })

    // Send confirmation email
    const emailDestino = email || paciente.email
    if (emailDestino) {
      const token = criarTokenCancelamento(agendamento.id)
      await enviarEmailConfirmacao({
        email: emailDestino,
        nomePaciente: nome,
        nomeProfissional: profissional?.user.name ?? 'Profissional',
        dataHoraInicio: inicio.toISOString(),
        dataHoraFim: fim.toISOString(),
        tokenCancelamento: token,
      })
    }

    return { agendamentoId: agendamento.id }
  } catch (e: any) {
    console.error('[agendarPublico]', e)
    return { error: 'Erro ao criar agendamento. Tente novamente.' }
  }
}
