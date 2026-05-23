'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
import { revalidatePath } from 'next/cache'
import { ReservaLocalSchema } from '@/lib/schemas/reserva-local'

export async function criarReservaLocal(localId: string, data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = ReservaLocalSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
    const db = getTenantDb()
    const overlap = await db.reservaLocal.findFirst({
      where: {
        localId,
        diaSemana: parsed.data.diaSemana,
        ativa: true,
        horaInicio: { lt: parsed.data.horaFim },
        horaFim: { gt: parsed.data.horaInicio },
      },
      include: { profissional: { include: { user: true } } },
    })
    if (overlap) return { error: `Já existe uma reserva neste horário para ${overlap.profissional.user.name}.` }
    await db.reservaLocal.create({
      data: {
        localId,
        profissionalId: parsed.data.profissionalId,
        diaSemana:      parsed.data.diaSemana,
        horaInicio:     parsed.data.horaInicio,
        horaFim:        parsed.data.horaFim,
        vigenciaInicio: parsed.data.vigenciaInicio ? new Date(parsed.data.vigenciaInicio) : null,
        vigenciaFim:    parsed.data.vigenciaFim    ? new Date(parsed.data.vigenciaFim)    : null,
        ativa:          parsed.data.ativa,
      },
    })
    revalidatePath(`/locais/${localId}/reservas`)
    return {}
  })
}

export async function atualizarReservaLocal(id: string, localId: string, data: unknown): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    const parsed = ReservaLocalSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
    const db = getTenantDb()
    const overlap = await db.reservaLocal.findFirst({
      where: {
        localId,
        diaSemana: parsed.data.diaSemana,
        ativa: true,
        id: { not: id },
        horaInicio: { lt: parsed.data.horaFim },
        horaFim: { gt: parsed.data.horaInicio },
      },
      include: { profissional: { include: { user: true } } },
    })
    if (overlap) return { error: `Já existe uma reserva neste horário para ${overlap.profissional.user.name}.` }
    await db.reservaLocal.update({
      where: { id },
      data: {
        profissionalId: parsed.data.profissionalId,
        diaSemana:      parsed.data.diaSemana,
        horaInicio:     parsed.data.horaInicio,
        horaFim:        parsed.data.horaFim,
        vigenciaInicio: parsed.data.vigenciaInicio ? new Date(parsed.data.vigenciaInicio) : null,
        vigenciaFim:    parsed.data.vigenciaFim    ? new Date(parsed.data.vigenciaFim)    : null,
        ativa:          parsed.data.ativa,
      },
    })
    revalidatePath(`/locais/${localId}/reservas`)
    return {}
  })
}

export async function toggleAtivaReservaLocal(id: string, localId: string, ativa: boolean): Promise<void> {
  return withTenantAction(async () => {
    const db = getTenantDb()
    await db.reservaLocal.update({ where: { id }, data: { ativa } })
    revalidatePath(`/locais/${localId}/reservas`)
  })
}

export async function deletarReservaLocal(id: string, localId: string): Promise<void> {
  return withTenantAction(async () => {
    const db = getTenantDb()
    await db.reservaLocal.delete({ where: { id } })
    revalidatePath(`/locais/${localId}/reservas`)
  })
}

export async function getReservaStatus(
  localId: string,
  profissionalId: string,
  diaSemana: number,
  horaInicio: string,
  horaFim: string,
): Promise<{ minha: boolean; nomeProfissional: string } | null> {
  return withTenantAction(async () => {
    const db = getTenantDb()
    const reserva = await db.reservaLocal.findFirst({
      where: {
        localId,
        diaSemana,
        ativa: true,
        horaInicio: { lt: horaFim },
        horaFim:    { gt: horaInicio },
      },
      include: { profissional: { include: { user: true } } },
    })
    if (!reserva) return null
    return {
      minha: reserva.profissionalId === profissionalId,
      nomeProfissional: reserva.profissional.user.name,
    }
  })
}
