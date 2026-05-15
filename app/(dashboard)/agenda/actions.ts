'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { AgendamentoSchema } from '@/lib/schemas/agendamento'
import { startOfWeek, endOfWeek } from 'date-fns'

// ──────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────

export async function getAgendamentos({
  inicio,
  fim,
  profissionalId,
  salaId,
  status,
  userRole,
  userProfissionalId,
}: {
  inicio: string
  fim: string
  profissionalId?: string
  salaId?: string
  status?: string
  userRole: string
  userProfissionalId?: string
}) {
  const where: Record<string, unknown> = {
    dataHoraInicio: { gte: new Date(inicio), lte: new Date(fim) },
  }

  if (userRole === 'PROFISSIONAL' && userProfissionalId) {
    where.profissionalId = userProfissionalId
  } else if (profissionalId) {
    where.profissionalId = profissionalId
  }

  if (salaId) where.salaId = salaId
  if (status && status !== 'TODOS') where.status = status

  const agendamentos = await db.agendamento.findMany({
    where,
    include: {
      profissional: { include: { user: { select: { name: true } } } },
      paciente: { select: { id: true, nome: true } },
      sala: { select: { id: true, nome: true } },
    },
    orderBy: { dataHoraInicio: 'asc' },
  })

  return agendamentos.map((a: (typeof agendamentos)[number]) => ({
    id: a.id,
    dataHoraInicio: a.dataHoraInicio.toISOString(),
    dataHoraFim: a.dataHoraFim.toISOString(),
    status: a.status as string,
    valor: Number(a.valor),
    observacoes: a.observacoes,
    origem: a.origem as string,
    profissional: { id: a.profissionalId, nome: a.profissional.user.name },
    paciente: { id: a.pacienteId, nome: a.paciente.nome },
    sala: { id: a.salaId, nome: a.sala.nome },
  }))
}

export async function buscarPacientes(query: string) {
  if (!query || query.length < 2) return []
  return db.paciente.findMany({
    where: {
      ativo: true,
      OR: [
        { nome: { contains: query, mode: 'insensitive' } },
        { cpf: { contains: query.replace(/\D/g, '') } },
      ],
    },
    select: { id: true, nome: true, cpf: true },
    take: 10,
    orderBy: { nome: 'asc' },
  })
}

// ──────────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────────

export async function criarAgendamento(data: unknown): Promise<{ error?: string }> {
  const parsed = AgendamentoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { dataHoraInicio, duracao, ...rest } = parsed.data
  const inicio = new Date(dataHoraInicio)
  const fim = new Date(inicio.getTime() + duracao * 60_000)

  const conflito = (where: Record<string, unknown>) =>
    db.agendamento.findFirst({
      where: {
        ...where,
        status: { notIn: ['CANCELADO'] },
        OR: [
          { dataHoraInicio: { gte: inicio, lt: fim } },
          { dataHoraFim: { gt: inicio, lte: fim } },
          { AND: [{ dataHoraInicio: { lte: inicio } }, { dataHoraFim: { gte: fim } }] },
        ],
      },
    })

  const [conflitoProfissional, conflitoSala] = await Promise.all([
    conflito({ profissionalId: rest.profissionalId }),
    conflito({ salaId: rest.salaId }),
  ])

  if (conflitoProfissional) return { error: 'Profissional já tem agendamento nesse horário' }
  if (conflitoSala) return { error: 'Sala já está ocupada nesse horário' }

  try {
    await db.agendamento.create({
      data: { ...rest, dataHoraInicio: inicio, dataHoraFim: fim, status: 'AGENDADO' },
    })
    revalidatePath('/agenda')
    return {}
  } catch (e: any) {
    return { error: 'Erro ao criar agendamento.' }
  }
}

export async function atualizarAgendamento(
  id: string,
  data: unknown
): Promise<{ error?: string }> {
  const parsed = AgendamentoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { dataHoraInicio, duracao, ...rest } = parsed.data
  const inicio = new Date(dataHoraInicio)
  const fim = new Date(inicio.getTime() + duracao * 60_000)

  const conflito = (where: Record<string, unknown>) =>
    db.agendamento.findFirst({
      where: {
        ...where,
        id: { not: id },
        status: { notIn: ['CANCELADO'] },
        OR: [
          { dataHoraInicio: { gte: inicio, lt: fim } },
          { dataHoraFim: { gt: inicio, lte: fim } },
          { AND: [{ dataHoraInicio: { lte: inicio } }, { dataHoraFim: { gte: fim } }] },
        ],
      },
    })

  const [conflitoProfissional, conflitoSala] = await Promise.all([
    conflito({ profissionalId: rest.profissionalId }),
    conflito({ salaId: rest.salaId }),
  ])

  if (conflitoProfissional) return { error: 'Profissional já tem agendamento nesse horário' }
  if (conflitoSala) return { error: 'Sala já está ocupada nesse horário' }

  try {
    await db.agendamento.update({
      where: { id },
      data: { ...rest, dataHoraInicio: inicio, dataHoraFim: fim },
    })
    revalidatePath('/agenda')
    return {}
  } catch {
    return { error: 'Erro ao atualizar agendamento.' }
  }
}

export async function atualizarStatusAgendamento(
  id: string,
  status: 'CONFIRMADO' | 'REALIZADO' | 'CANCELADO' | 'FALTOU'
): Promise<{ error?: string }> {
  try {
    const agendamento = await db.agendamento.findUnique({
      where: { id },
      include: {
        profissional: { select: { tipoVinculo: true, comissaoPercentual: true } },
      },
    })
    if (!agendamento) return { error: 'Agendamento não encontrado' }

    if (status === 'REALIZADO') {
      await db.$transaction(async (tx) => {
        await tx.agendamento.update({ where: { id }, data: { status } })

        // Cria comissão se COMISSIONADO
        const prof = agendamento.profissional
        if (prof.tipoVinculo === 'COMISSIONADO' && prof.comissaoPercentual) {
          const percentual = Number(prof.comissaoPercentual)
          const valorBruto = Number(agendamento.valor)
          const valorComissao = (valorBruto * percentual) / 100
          const valorClinica = valorBruto - valorComissao

          const comissaoExistente = await tx.comissao.findUnique({
            where: { agendamentoId: id },
          })
          if (!comissaoExistente) {
            await tx.comissao.create({
              data: {
                profissionalId: agendamento.profissionalId,
                agendamentoId: id,
                valorBruto,
                percentual,
                valorComissao,
                valorClinica,
                status: 'PENDENTE',
              },
            })
          }
        }

        // Cria transação financeira de receita
        const categoria = await tx.categoriaFinanceira.findFirst({
          where: { tipo: 'RECEITA' },
          orderBy: { nome: 'asc' },
        })
        if (categoria) {
          const transacaoExistente = await tx.transacaoFinanceira.findFirst({
            where: { agendamentoId: id, tipo: 'RECEITA' },
          })
          if (!transacaoExistente) {
            await tx.transacaoFinanceira.create({
              data: {
                tipo: 'RECEITA',
                categoriaId: categoria.id,
                descricao: `Consulta — ${agendamento.pacienteId}`,
                valor: agendamento.valor,
                data: new Date(),
                status: 'PAGO',
                agendamentoId: id,
                profissionalId: agendamento.profissionalId,
              },
            })
          }
        }
      })
    } else {
      await db.agendamento.update({ where: { id }, data: { status } })
    }

    revalidatePath('/agenda')
    return {}
  } catch (e) {
    console.error(e)
    return { error: 'Erro ao atualizar status.' }
  }
}

export async function deletarAgendamento(id: string): Promise<void> {
  await db.agendamento.delete({ where: { id } })
  revalidatePath('/agenda')
}

// ──────────────────────────────────────────────
// Disponibilidade
// ──────────────────────────────────────────────

export async function salvarDisponibilidade(
  profissionalId: string,
  disponibilidades: { diaSemana: number; horaInicio: string; horaFim: string }[]
): Promise<{ error?: string }> {
  try {
    await db.$transaction(async (tx) => {
      await tx.disponibilidade.deleteMany({ where: { profissionalId } })
      if (disponibilidades.length > 0) {
        await tx.disponibilidade.createMany({
          data: disponibilidades.map((d) => ({ ...d, profissionalId })),
        })
      }
    })
    revalidatePath(`/profissionais/${profissionalId}`)
    return {}
  } catch {
    return { error: 'Erro ao salvar disponibilidade.' }
  }
}

// ──────────────────────────────────────────────
// Bloqueios
// ──────────────────────────────────────────────

export async function criarBloqueio(
  profissionalId: string,
  data: { dataHoraInicio: string; dataHoraFim: string; motivo?: string }
): Promise<{ error?: string }> {
  try {
    await db.bloqueio.create({
      data: {
        profissionalId,
        dataHoraInicio: new Date(data.dataHoraInicio),
        dataHoraFim: new Date(data.dataHoraFim),
        motivo: data.motivo || null,
      },
    })
    revalidatePath(`/profissionais/${profissionalId}`)
    return {}
  } catch {
    return { error: 'Erro ao criar bloqueio.' }
  }
}

export async function deletarBloqueio(id: string): Promise<void> {
  await db.bloqueio.delete({ where: { id } })
  revalidatePath('/profissionais')
}
