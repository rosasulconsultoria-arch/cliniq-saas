import { getTenantDb } from '@/lib/prisma'

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

export async function getSalaDisponivel(inicio: Date, fim: Date): Promise<string | null> {
  const db = getTenantDb()

  const salas = await db.sala.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' } })

  for (const sala of salas) {
    const conflito = await db.agendamento.findFirst({
      where: {
        salaId: sala.id,
        status: { notIn: ['CANCELADO'] },
        OR: [
          { dataHoraInicio: { gte: inicio, lt: fim } },
          { dataHoraFim: { gt: inicio, lte: fim } },
          { AND: [{ dataHoraInicio: { lte: inicio } }, { dataHoraFim: { gte: fim } }] },
        ],
      },
    })
    if (!conflito) return sala.id
  }

  return null
}
