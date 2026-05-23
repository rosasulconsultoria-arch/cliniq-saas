import { getTenantDb } from '@/lib/prisma'
import { TIPO_LOCAL_FISICO } from '@/lib/schemas/local'

// HH:MM string a partir de um Date — agendamentos não cruzam meia-noite (premissa de clínica)
function formatTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

/**
 * Valida se um agendamento pode ser criado/atualizado sem conflito.
 * Deve ser chamada dentro de runWithTenant ou withTenantAction.
 */
export async function validarConflitoAgendamento(
  profissionalId: string,
  localId: string,
  inicio: Date,
  fim: Date,
  excluirAgendamentoId?: string,
): Promise<{ ok: boolean; motivo?: string }> {
  // Assert implícito: lança se chamada fora de contexto de tenant
  const db = getTenantDb()

  const idExclusao = excluirAgendamentoId ? { not: excluirAgendamentoId } : undefined
  const overlapWhere = [{ dataHoraInicio: { lt: fim }, dataHoraFim: { gt: inicio } }]

  // 1. Conflito de profissional — sempre valida
  const conflitoProf = await db.agendamento.findFirst({
    where: {
      profissionalId,
      ...(idExclusao && { id: idExclusao }),
      status: { notIn: ['CANCELADO'] },
      OR: overlapWhere,
    },
  })
  if (conflitoProf) return { ok: false, motivo: 'Profissional já tem agendamento nesse horário' }

  // 2. Conflito de local — depende do tipo
  const local = await db.local.findFirst({
    where: { id: localId },
    select: { tipo: true },
  })
  if (!local) return { ok: false, motivo: 'Local não encontrado' }

  // ONLINE e DOMICILIAR: múltiplos profissionais podem usar simultaneamente
  if (local.tipo === 'ONLINE' || local.tipo === 'DOMICILIAR') {
    return { ok: true }
  }

  // SALA ou EXTERNO: verificar ReservaLocal ativa que cobre o slot
  // Sobreposição: reserva.horaInicio < formatTime(fim) AND reserva.horaFim > formatTime(inicio)
  // Boundary exato (reserva termina no mesmo minuto que agendamento começa) não é conflito
  const reserva = await db.reservaLocal.findFirst({
    where: {
      localId,
      diaSemana: inicio.getDay(),
      ativa: true,
      AND: [
        { OR: [{ vigenciaInicio: null }, { vigenciaInicio: { lte: inicio } }] },
        { OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: inicio } }] },
      ],
      horaInicio: { lt: formatTime(fim) },
      horaFim: { gt: formatTime(inicio) },
    },
  })

  if (reserva) {
    if (reserva.profissionalId === profissionalId) return { ok: true }
    return { ok: false, motivo: 'Local reservado para outro profissional neste horário' }
  }

  // Sem reserva ativa: conflito padrão de agendamento no local
  const conflitoLocal = await db.agendamento.findFirst({
    where: {
      localId,
      ...(idExclusao && { id: idExclusao }),
      status: { notIn: ['CANCELADO'] },
      OR: overlapWhere,
    },
  })
  if (conflitoLocal) return { ok: false, motivo: 'Local já está ocupado nesse horário' }

  return { ok: true }
}

export async function getHorariosDisponiveis(
  profissionalId: string,
  data: string // 'YYYY-MM-DD'
): Promise<string[]> {
  const db = getTenantDb()

  const [ano, mes, dia] = data.split('-').map(Number)
  const dataObj = new Date(ano, mes - 1, dia)
  const diaSemana = dataObj.getDay()

  const disponibilidade = await db.disponibilidade.findFirst({
    where: { profissionalId, diaSemana },
  })
  if (!disponibilidade) return []

  const startOfDay = new Date(ano, mes - 1, dia, 0, 0, 0)
  const endOfDay = new Date(ano, mes - 1, dia, 23, 59, 59)

  const [bloqueios, agendamentos] = await Promise.all([
    db.bloqueio.findMany({
      where: {
        profissionalId,
        dataHoraInicio: { lte: endOfDay },
        dataHoraFim: { gte: startOfDay },
      },
    }),
    db.agendamento.findMany({
      where: {
        profissionalId,
        dataHoraInicio: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELADO'] },
      },
    }),
  ])

  const [hInicio, mInicio] = disponibilidade.horaInicio.split(':').map(Number)
  const [hFim, mFim] = disponibilidade.horaFim.split(':').map(Number)
  const startMin = hInicio * 60 + mInicio
  const endMin = hFim * 60 + mFim
  const agora = new Date()

  const slots: string[] = []
  let cur = startMin

  while (cur + 50 <= endMin) {
    const h = Math.floor(cur / 60)
    const m = cur % 60
    const slotInicio = new Date(ano, mes - 1, dia, h, m, 0)
    const slotFim = new Date(slotInicio.getTime() + 50 * 60_000)

    const passado = slotInicio <= agora
    const bloqueado = bloqueios.some(
      (b) => b.dataHoraInicio < slotFim && b.dataHoraFim > slotInicio
    )
    const ocupado = agendamentos.some(
      (a) => a.dataHoraInicio < slotFim && a.dataHoraFim > slotInicio
    )

    if (!passado && !bloqueado && !ocupado) {
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
    }

    cur += 50
  }

  return slots
}

/**
 * Encontra o primeiro local físico disponível para um horário.
 * Locais tipo ONLINE ou DOMICILIAR não são retornados aqui —
 * eles nunca ficam "ocupados" por outros agendamentos.
 *
 * TODO(reservas): considerar ReservaLocal ao buscar locais livres —
 * atualmente pode sugerir local com reserva ativa de outro profissional.
 */
export async function getLocalDisponivel(inicio: Date, fim: Date): Promise<string | null> {
  const db = getTenantDb()

  const locais = await db.local.findMany({
    where: {
      ativa: true,
      tipo: { in: TIPO_LOCAL_FISICO },
    },
    orderBy: { nome: 'asc' },
  })

  for (const local of locais) {
    const conflito = await db.agendamento.findFirst({
      where: {
        localId: local.id,
        status: { notIn: ['CANCELADO'] },
        OR: [
          { dataHoraInicio: { gte: inicio, lt: fim } },
          { dataHoraFim: { gt: inicio, lte: fim } },
          { AND: [{ dataHoraInicio: { lte: inicio } }, { dataHoraFim: { gte: fim } }] },
        ],
      },
    })
    if (!conflito) return local.id
  }

  return null
}
