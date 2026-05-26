'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { revalidatePath } from 'next/cache'
import { AgendamentoSchema } from '@/lib/schemas/agendamento'
import { verificarBillingAction } from '@/lib/billing/require-access'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { enviarConfirmacaoEmail, gerarLinkWhatsApp } from '@/lib/notificacoes'
import { validarConflitoAgendamento } from '@/lib/agendamento'

// ──────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────

export async function getAgendamentos({
  inicio,
  fim,
  profissionalId,
  localId,
  status,
  userRole,
  userProfissionalId,
}: {
  inicio: string
  fim: string
  profissionalId?: string
  localId?: string
  status?: string
  userRole: string
  userProfissionalId?: string
}) {
  return withTenantAction(async () => {
    const db = getTenantDb()

    const where: Record<string, unknown> = {
      dataHoraInicio: { gte: new Date(inicio), lte: new Date(fim) },
    }

    if (profissionalId && profissionalId !== 'todos') {
      where.profissionalId = profissionalId
    }

    if (localId) where.localId = localId
    if (status && status !== 'TODOS') where.status = status

    const agendamentos = await db.agendamento.findMany({
      where,
      include: {
        profissional: { select: { id: true, fotoBase64: true, asaasApiKey: true, user: { select: { name: true } } } },
        paciente: { select: { id: true, nome: true, email: true, telefone: true } },
        local: { select: { id: true, nome: true } },
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
      asaasPaymentId: a.asaasPaymentId ?? null,
      asaasInvoiceUrl: a.asaasInvoiceUrl ?? null,
      asaasPaymentStatus: a.asaasPaymentStatus ?? null,
      profissional: { id: a.profissionalId, nome: a.profissional.user.name, foto: a.profissional.fotoBase64 ?? null, temAsaas: !!a.profissional.asaasApiKey },
      paciente: { id: a.pacienteId, nome: a.paciente.nome, email: a.paciente.email ?? null, telefone: a.paciente.telefone ?? null },
      sala: { id: a.localId, nome: a.local.nome },
    }))
  })
}

export async function buscarPacientes(query: string) {
  return withTenantAction(async () => {
    if (!query || query.length < 2) return []
    const db = getTenantDb()
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
  })
}

// ──────────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────────

export async function criarAgendamento(data: unknown): Promise<{ error?: string; whatsappLink?: string; count?: number }> {
  return withTenantAction(async () => {
    const erroBilling = await verificarBillingAction()
    if (erroBilling) return { error: erroBilling }

    const parsed = AgendamentoSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

    const db = getTenantDb()
    const { dataHoraInicio, duracao, recorrente, totalRecorrencias, servicoIds, ...rest } = parsed.data
    const inicio = new Date(dataHoraInicio)
    const fim = new Date(inicio.getTime() + duracao * 60_000)

    // ── Agendamento recorrente ──
    if (recorrente && totalRecorrencias && totalRecorrencias >= 2) {
      const ocorrencias = Array.from({ length: totalRecorrencias }, (_, i) => {
        const dtInicio = new Date(inicio.getTime() + i * 7 * 24 * 60 * 60 * 1000)
        const dtFim = new Date(dtInicio.getTime() + duracao * 60_000)
        return { dtInicio, dtFim }
      })

      for (const { dtInicio, dtFim } of ocorrencias) {
        const resultado = await validarConflitoAgendamento(rest.profissionalId, rest.localId, dtInicio, dtFim)
        if (!resultado.ok) {
          const dataLabel = format(dtInicio, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
          return { error: `${resultado.motivo} em ${dataLabel}` }
        }
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
        if (servicoIds && servicoIds.length > 0) {
          const criados = await db.agendamento.findMany({
            where: { recorrenciaGrupoId: grupoId },
            select: { id: true },
          })
          // AgendamentoServico é SKIP_TENANT — criado via FK de agendamento que já tem tenantId
          await db.agendamentoServico.createMany({
            data: criados.flatMap(a => servicoIds.map(s => ({ agendamentoId: a.id, servicoId: s }))),
          })
        }
        revalidatePath('/agenda')
        return { count: totalRecorrencias }
      } catch {
        return { error: 'Erro ao criar agendamentos recorrentes.' }
      }
    }

    // ── Agendamento único ──
    const resultado = await validarConflitoAgendamento(rest.profissionalId, rest.localId, inicio, fim)
    if (!resultado.ok) return { error: resultado.motivo! }

    try {
      const agend = await db.agendamento.create({
        data: { ...rest, dataHoraInicio: inicio, dataHoraFim: fim, status: 'AGENDADO' },
        include: {
          paciente: { select: { nome: true, email: true, telefone: true } },
          profissional: { include: { user: { select: { name: true } } } },
          local: { select: { nome: true } },
        },
      })

      if (servicoIds && servicoIds.length > 0) {
        await db.agendamentoServico.createMany({
          data: servicoIds.map(s => ({ agendamentoId: agend.id, servicoId: s })),
        })
      }

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
        // Parcela é SKIP_TENANT — criada via FK de parcelamento que já tem tenantId
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

      const dadosNotif = {
        id: agend.id,
        dataHoraInicio: agend.dataHoraInicio,
        dataHoraFim: agend.dataHoraFim,
        valor: Number(agend.valor),
        pacienteNome: agend.paciente.nome,
        pacienteEmail: agend.paciente.email,
        pacienteTelefone: agend.paciente.telefone,
        profissionalNome: agend.profissional.user.name,
        localNome: agend.local.nome,
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
    } catch {
      return { error: 'Erro ao criar agendamento.' }
    }
  })
}

export async function atualizarAgendamento(id: string, data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = AgendamentoSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

    const db = getTenantDb()
    const { dataHoraInicio, duracao, ...rest } = parsed.data
    const inicio = new Date(dataHoraInicio)
    const fim = new Date(inicio.getTime() + duracao * 60_000)

    const resultado = await validarConflitoAgendamento(rest.profissionalId, rest.localId, inicio, fim, id)
    if (!resultado.ok) return { error: resultado.motivo! }

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
  })
}

export async function atualizarStatusAgendamento(
  id: string,
  status: 'CONFIRMADO' | 'REALIZADO' | 'CANCELADO' | 'FALTOU'
): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const db = getTenantDb()

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

          const prof = agendamento.profissional
          if (prof.tipoVinculo === 'COMISSIONADO' && prof.comissaoPercentual) {
            const percentual = Number(prof.comissaoPercentual)
            const valorBruto = Number(agendamento.valor)
            const valorComissao = (valorBruto * percentual) / 100
            const valorClinica = valorBruto - valorComissao

            const comissaoExistente = await tx.comissao.findUnique({ where: { agendamentoId: id } })
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
  })
}

export async function deletarAgendamento(id: string): Promise<void> {
  return withTenantAction(async () => {
    const db = getTenantDb()
    await db.agendamento.delete({ where: { id } })
    revalidatePath('/agenda')
  })
}

// ──────────────────────────────────────────────
// Disponibilidade
// ──────────────────────────────────────────────

export async function salvarDisponibilidade(
  profissionalId: string,
  disponibilidades: { diaSemana: number; horaInicio: string; horaFim: string }[]
): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const db = getTenantDb()
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
  })
}

// ──────────────────────────────────────────────
// Bloqueios
// ──────────────────────────────────────────────

export async function criarBloqueio(
  profissionalId: string,
  data: { dataHoraInicio: string; dataHoraFim: string; motivo?: string }
): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const db = getTenantDb()
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
  })
}

export async function deletarBloqueio(id: string): Promise<void> {
  return withTenantAction(async () => {
    const db = getTenantDb()
    await db.bloqueio.delete({ where: { id } })
    revalidatePath('/profissionais')
  })
}
