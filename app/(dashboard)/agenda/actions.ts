'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { AgendamentoSchema } from '@/lib/schemas/agendamento'
import { startOfWeek, endOfWeek, addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { enviarConfirmacaoEmail, gerarLinkWhatsApp } from '@/lib/notificacoes'

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

  if (profissionalId && profissionalId !== 'todos') {
    where.profissionalId = profissionalId
  }

  if (salaId) where.salaId = salaId
  if (status && status !== 'TODOS') where.status = status

  const agendamentos = await db.agendamento.findMany({
    where,
    include: {
      profissional: { select: { id: true, fotoBase64: true, user: { select: { name: true } } } },
      paciente: { select: { id: true, nome: true, email: true, telefone: true } },
      sala: { select: { id: true, nome: true } },
    },
    orderBy: { dataHoraInicio: 'asc' },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (agendamentos as any[]).map((a) => ({
    id: a.id,
    dataHoraInicio: a.dataHoraInicio.toISOString(),
    dataHoraFim: a.dataHoraFim.toISOString(),
    status: a.status as string,
    valor: Number(a.valor),
    observacoes: a.observacoes,
    origem: a.origem as string,
    tipoCobranca: a.tipoCobranca,
    totalSessoes: a.totalSessoes,
    formaPagamento: a.formaPagamento ?? null,
    bandeiraCartao: a.bandeiraCartao ?? null,
    numeroParcelas: a.numeroParcelas ?? null,
    confirmacaoEnviada: a.confirmacaoEnviada ?? false,
    profissional: { id: a.profissionalId, nome: a.profissional.user.name, foto: (a.profissional as any).fotoBase64 ?? null },
    paciente: { id: a.pacienteId, nome: a.paciente.nome, email: a.paciente.email ?? null, telefone: a.paciente.telefone ?? null },
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

export async function criarAgendamento(data: unknown): Promise<{ error?: string; whatsappLink?: string; count?: number }> {
  const parsed = AgendamentoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { dataHoraInicio, duracao, recorrente, totalRecorrencias, ...rest } = parsed.data
  const inicio = new Date(dataHoraInicio)
  const fim = new Date(inicio.getTime() + duracao * 60_000)

  const conflito = (where: Record<string, unknown>, dtInicio: Date, dtFim: Date) =>
    db.agendamento.findFirst({
      where: {
        ...where,
        status: { notIn: ['CANCELADO'] },
        OR: [
          { dataHoraInicio: { gte: dtInicio, lt: dtFim } },
          { dataHoraFim: { gt: dtInicio, lte: dtFim } },
          { AND: [{ dataHoraInicio: { lte: dtInicio } }, { dataHoraFim: { gte: dtFim } }] },
        ],
      },
    })

  // ── Agendamento recorrente ──────────────────────────────────────────────────
  if (recorrente && totalRecorrencias && totalRecorrencias >= 2) {
    const ocorrencias = Array.from({ length: totalRecorrencias }, (_, i) => {
      const dtInicio = new Date(inicio.getTime() + i * 7 * 24 * 60 * 60 * 1000)
      const dtFim = new Date(dtInicio.getTime() + duracao * 60_000)
      return { dtInicio, dtFim }
    })

    for (const { dtInicio, dtFim } of ocorrencias) {
      const [cp, cs] = await Promise.all([
        conflito({ profissionalId: rest.profissionalId }, dtInicio, dtFim),
        conflito({ salaId: rest.salaId }, dtInicio, dtFim),
      ])
      const dataLabel = format(dtInicio, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      if (cp) return { error: `Conflito de horário do profissional em ${dataLabel}` }
      if (cs) return { error: `Sala ocupada em ${dataLabel}` }
    }

    const grupoId = crypto.randomUUID()
    try {
      await db.agendamento.createMany({
        data: ocorrencias.map(({ dtInicio, dtFim }) => ({
          ...rest,
          dataHoraInicio: dtInicio,
          dataHoraFim: dtFim,
          status: 'AGENDADO',
          recorrenciaGrupoId: grupoId,
        })),
      })
      revalidatePath('/agenda')
      return { count: totalRecorrencias }
    } catch {
      return { error: 'Erro ao criar agendamentos recorrentes.' }
    }
  }

  // ── Agendamento único ───────────────────────────────────────────────────────
  const [conflitoProfissional, conflitoSala] = await Promise.all([
    conflito({ profissionalId: rest.profissionalId }, inicio, fim),
    conflito({ salaId: rest.salaId }, inicio, fim),
  ])

  if (conflitoProfissional) return { error: 'Profissional já tem agendamento nesse horário' }
  if (conflitoSala) return { error: 'Sala já está ocupada nesse horário' }

  try {
    const agend = await db.agendamento.create({
      data: { ...rest, dataHoraInicio: inicio, dataHoraFim: fim, status: 'AGENDADO' },
      include: {
        paciente: { select: { nome: true, email: true, telefone: true } },
        profissional: { include: { user: { select: { name: true } } } },
        sala: { select: { nome: true } },
      },
    })

    // Auto-criar parcelamento se cartão crédito com parcelas > 1
    const { formaPagamento, bandeiraCartao, numeroParcelas, taxaCartaoPerc, valor } = rest as any
    if (formaPagamento === 'CARTAO_CREDITO' && numeroParcelas && numeroParcelas > 1 && bandeiraCartao) {
      const taxa = Number(taxaCartaoPerc ?? 0)
      const valorTotal = Number(valor)
      const valorLiquido = valorTotal * (1 - taxa / 100)
      const valorParcela = valorLiquido / numeroParcelas
      const p = await db.parcelamento.create({
        data: {
          profissionalId: rest.profissionalId,
          agendamentoId: agend.id,
          descricao: `Consulta — ${agend.paciente.nome}`,
          valorTotal,
          bandeira: bandeiraCartao,
          tipoPagamento: 'CREDITO',
          taxaCartao: taxa,
          totalParcelas: numeroParcelas,
          valorLiquido,
        },
      })
      await db.parcela.createMany({
        data: Array.from({ length: numeroParcelas }, (_, i) => ({
          parcelamentoId: p.id,
          numero: i + 1,
          dataVencimento: addMonths(inicio, i),
          valor: valorParcela,
          status: 'PENDENTE',
        })),
      })
    }

    // Enviar confirmação por email
    const dadosNotif = {
      id: agend.id,
      dataHoraInicio: agend.dataHoraInicio,
      dataHoraFim: agend.dataHoraFim,
      valor: Number(agend.valor),
      pacienteNome: agend.paciente.nome,
      pacienteEmail: agend.paciente.email,
      pacienteTelefone: agend.paciente.telefone,
      profissionalNome: agend.profissional.user.name,
      salaNome: agend.sala.nome,
      tipoCobranca: agend.tipoCobranca,
      totalSessoes: agend.totalSessoes,
      formaPagamento: (agend as any).formaPagamento,
      numeroParcelas: (agend as any).numeroParcelas,
    }
    const emailEnviado = await enviarConfirmacaoEmail(dadosNotif)
    if (emailEnviado) {
      await db.agendamento.update({ where: { id: agend.id }, data: { confirmacaoEnviada: true } })
    }

    const linkWhats = gerarLinkWhatsApp(dadosNotif, 'confirmacao')

    revalidatePath('/agenda')
    return { whatsappLink: linkWhats || undefined }
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
        paciente: { select: { nome: true } },
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
                observacao: agendamento.tipoCobranca === 'PACOTE'
                  ? `Pacote de ${agendamento.totalSessoes} sessões — ${agendamento.paciente.nome}`
                  : null,
              },
            })
          }
        }

        // Cria transação financeira de receita (somente para LOCATARIO — COMISSIONADO gera receita via pagarComissao)
        if (prof.tipoVinculo === 'LOCATARIO') {
          const categoria = await tx.categoriaFinanceira.findFirst({
            where: { tipo: 'RECEITA' },
            orderBy: { nome: 'asc' },
          })
          if (categoria) {
            const transacaoExistente = await tx.transacaoFinanceira.findFirst({
              where: { agendamentoId: id, tipo: 'RECEITA' },
            })
            if (!transacaoExistente) {
              const isPacote = agendamento.tipoCobranca === 'PACOTE'
              const descricao = isPacote
                ? `Pacote ${agendamento.totalSessoes} sessões — ${agendamento.paciente.nome}`
                : `Consulta — ${agendamento.paciente.nome}`
              await tx.transacaoFinanceira.create({
                data: {
                  tipo: 'RECEITA',
                  categoriaId: categoria.id,
                  descricao,
                  valor: agendamento.valor,
                  data: new Date(),
                  status: 'PAGO',
                  agendamentoId: id,
                  profissionalId: agendamento.profissionalId,
                },
              })
            }
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
