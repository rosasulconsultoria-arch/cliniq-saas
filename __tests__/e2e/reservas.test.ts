/**
 * Suite E2E — ReservaLocal e validação de conflito por tipo de local
 *
 * Roda contra DATABASE_URL_TEST (schema=test_schema).
 * Usa os tenants semeados pelo globalSetup (clinic-a, clinic-b).
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'
import { validarConflitoAgendamento } from '@/lib/agendamento'

let tidA: string, tidB: string
let prof1AId: string, prof2AId: string
let prof1BId: string
let localAId: string, localBId: string

beforeAll(async () => {
  const tA = await db.tenant.findUnique({ where: { slug: 'clinic-a' } })
  const tB = await db.tenant.findUnique({ where: { slug: 'clinic-b' } })
  if (!tA || !tB) throw new Error('Seed não encontrado. Rode setup primeiro.')
  tidA = tA.id
  tidB = tB.id

  const [p1A] = await db.profissional.findMany({ where: { tenantId: tidA, slugAgendamento: 'dr-test' } })
  const [p2A] = await db.profissional.findMany({ where: { tenantId: tidA, slugAgendamento: 'dr-a-only' } })
  const [p1B] = await db.profissional.findMany({ where: { tenantId: tidB, slugAgendamento: 'dr-test' } })
  prof1AId = p1A.id
  prof2AId = p2A.id
  prof1BId = p1B.id

  const lA = await db.local.findFirst({ where: { tenantId: tidA, nome: 'Local A1' } })
  const lB = await db.local.findFirst({ where: { tenantId: tidB, nome: 'Local B1' } })
  if (!lA || !lB) throw new Error('Locais semeados não encontrados. Rode setup primeiro.')
  localAId = lA.id
  localBId = lB.id
}, 30_000)

afterEach(async () => {
  await db.reservaLocal.deleteMany({ where: { localId: { in: [localAId, localBId] } } })
})

// ═══════════════════════════════════════════════════════════════════════════
// Cenário 1 — Reserva ativa bloqueia outro profissional
// ═══════════════════════════════════════════════════════════════════════════
it('21. Reserva ativa de prof1A bloqueia agendamento de prof2A no mesmo horário', async () => {
  // Quinta-feira = dia 4
  const quinta = new Date('2026-06-11T14:00:00')
  const quintatFim = new Date('2026-06-11T15:00:00')

  await db.reservaLocal.create({
    data: {
      tenantId:      tidA,
      localId:       localAId,
      profissionalId: prof1AId,
      diaSemana:     4, // quinta
      horaInicio:    '13:00',
      horaFim:       '17:00',
      ativa:         true,
    },
  })

  const res = await runWithTenant(tidA, () =>
    validarConflitoAgendamento(prof2AId, localAId, quinta, quintatFim)
  )

  expect(res.ok).toBe(false)
  expect(res.motivo).toBe('Local reservado para outro profissional neste horário')
}, 15_000)

// ═══════════════════════════════════════════════════════════════════════════
// Cenário 2 — Reserva do próprio profissional permite agendamento
// ═══════════════════════════════════════════════════════════════════════════
it('22. Reserva ativa do próprio prof1A permite agendamento no mesmo horário', async () => {
  const quinta = new Date('2026-06-11T14:00:00')
  const quintaFim = new Date('2026-06-11T15:00:00')

  await db.reservaLocal.create({
    data: {
      tenantId:      tidA,
      localId:       localAId,
      profissionalId: prof1AId,
      diaSemana:     4,
      horaInicio:    '13:00',
      horaFim:       '17:00',
      ativa:         true,
    },
  })

  const res = await runWithTenant(tidA, () =>
    validarConflitoAgendamento(prof1AId, localAId, quinta, quintaFim)
  )

  expect(res.ok).toBe(true)
}, 15_000)

// ═══════════════════════════════════════════════════════════════════════════
// Cenário 3 — Reserva com vigenciaFim no passado é ignorada
// ═══════════════════════════════════════════════════════════════════════════
it('23. Reserva com vigenciaFim no passado é ignorada — prof2A pode agendar', async () => {
  const quinta = new Date('2026-06-11T14:00:00')
  const quintaFim = new Date('2026-06-11T15:00:00')

  await db.reservaLocal.create({
    data: {
      tenantId:      tidA,
      localId:       localAId,
      profissionalId: prof1AId,
      diaSemana:     4,
      horaInicio:    '13:00',
      horaFim:       '17:00',
      ativa:         true,
      vigenciaFim:   new Date('2026-01-01'), // expirada
    },
  })

  const res = await runWithTenant(tidA, () =>
    validarConflitoAgendamento(prof2AId, localAId, quinta, quintaFim)
  )

  // Reserva expirada não bloqueia — sem agendamento sobreposto existente → ok
  expect(res.ok).toBe(true)
}, 15_000)

// ═══════════════════════════════════════════════════════════════════════════
// Cenário 4 — Multi-tenant: reservas de tenants diferentes são isoladas
// ═══════════════════════════════════════════════════════════════════════════
it('24. Reserva de TenantA não afeta validação de TenantB no mesmo dia/hora', async () => {
  const quinta = new Date('2026-06-11T14:00:00')
  const quintaFim = new Date('2026-06-11T15:00:00')

  // Cria reserva em TenantA cobrindo quinta 13h-17h
  await db.reservaLocal.create({
    data: {
      tenantId:      tidA,
      localId:       localAId,
      profissionalId: prof1AId,
      diaSemana:     4,
      horaInicio:    '13:00',
      horaFim:       '17:00',
      ativa:         true,
    },
  })

  // Valida agendamento de prof1B em TenantB — não deve ver a reserva de TenantA
  const res = await runWithTenant(tidB, () =>
    validarConflitoAgendamento(prof1BId, localBId, quinta, quintaFim)
  )

  expect(res.ok).toBe(true)
}, 15_000)
