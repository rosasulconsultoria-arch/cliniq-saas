'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { getHorariosDisponiveis, getLocalDisponivel } from '@/lib/agendamento'
import { criarTokenCancelamento } from '@/lib/tokens'
import { enviarEmailConfirmacao } from '@/lib/email'
import { validarCPF } from '@/lib/utils'
import { z } from 'zod'

export async function getHorariosAction(profissionalId: string, data: string) {
  return withTenantAction(async () => getHorariosDisponiveis(profissionalId, data))
}

export async function buscarPacientePorCPF(cpf: string) {
  const nums = cpf.replace(/\D/g, '')
  if (nums.length !== 11 || !validarCPF(nums)) return null

  return withTenantAction(async () => {
    const db = getTenantDb()
    // cpf é @@unique([cpf, tenantId]) — findFirst com extension injeta tenantId automaticamente
    return db.paciente.findFirst({
      where: { cpf: nums },
      select: { id: true, nome: true, telefone: true, email: true, dataNascimento: true },
    })
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
  data: string
  horario: string
  pacienteData: unknown
}): Promise<{ error?: string; agendamentoId?: string }> {
  const pacienteParsed = PacientePublicoSchema.safeParse(pacienteData)
  if (!pacienteParsed.success) {
    return { error: pacienteParsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  return withTenantAction(async () => {
    const db = getTenantDb()

    const [ano, mes, dia] = data.split('-').map(Number)
    const [h, m] = horario.split(':').map(Number)
    const inicio = new Date(ano, mes - 1, dia, h, m, 0)
    const fim = new Date(inicio.getTime() + 50 * 60_000)

    const slotsDisponiveis = await getHorariosDisponiveis(profissionalId, data)
    if (!slotsDisponiveis.includes(horario)) {
      return { error: 'Este horário não está mais disponível. Por favor, escolha outro.' }
    }

    const localId = await getLocalDisponivel(inicio, fim)
    if (!localId) {
      return { error: 'Não há locais disponíveis neste horário. Tente outro horário.' }
    }

    const cpf = pacienteParsed.data.cpf.replace(/\D/g, '')
    const { nome, telefone, email, dataNascimento } = pacienteParsed.data

    const profissional = await db.profissional.findFirst({
      where: { id: profissionalId },
      include: { user: { select: { name: true } } },
    })

    try {
      // cpf único por tenant — findFirst com extension filtra por tenantId automaticamente
      let paciente = await db.paciente.findFirst({ where: { cpf } })

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
          localId,
          dataHoraInicio: inicio,
          dataHoraFim: fim,
          status: 'AGENDADO',
          valor: profissional?.valorConsultaPadrao ?? 0,
          origem: 'PUBLICO',
        },
      })

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
  })
}
