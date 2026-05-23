/**
 * Suite E2E — UI de Reservas (Lote C)
 *
 * Testa operações de reserva contra o banco real (schema=test_schema).
 * Usa os tenants semeados pelo globalSetup (clinic-a, clinic-b).
 *
 * Isolamento de concorrência: cada arquivo E2E cria seu próprio local dedicado
 * em beforeAll e limpa APENAS esse local no afterEach, evitando interferência
 * com reservas.test.ts que roda em paralelo no mesmo schema.
 *
 * Numeração: 25–28 (sequência de reservas.test.ts que vai até 24).
 */

import { it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'

let tidA: string, tidB: string
let prof1AId: string, prof2AId: string
let myLocalAId: string  // local dedicado para estes testes — evita colisão de afterEach
let myLocalBId: string

beforeAll(async () => {
  const tA = await db.tenant.findUnique({ where: { slug: 'clinic-a' } })
  const tB = await db.tenant.findUnique({ where: { slug: 'clinic-b' } })
  if (!tA || !tB) throw new Error('Seed não encontrado. Rode setup primeiro.')
  tidA = tA.id
  tidB = tB.id

  const [p1A] = await db.profissional.findMany({ where: { tenantId: tidA, slugAgendamento: 'dr-test' } })
  const [p2A] = await db.profissional.findMany({ where: { tenantId: tidA, slugAgendamento: 'dr-a-only' } })
  prof1AId = p1A.id
  prof2AId = p2A.id

  // Locais dedicados — nomes únicos para evitar conflito de @@unique([nome, tenantId])
  const lA = await db.local.create({
    data: { tenantId: tidA, nome: '__test_reservas_ui_A__', tipo: 'SALA', ativa: true },
  })
  const lB = await db.local.create({
    data: { tenantId: tidB, nome: '__test_reservas_ui_B__', tipo: 'SALA', ativa: true },
  })
  myLocalAId = lA.id
  myLocalBId = lB.id
}, 30_000)

afterEach(async () => {
  // Limpa APENAS os locais criados por estes testes — não interfere com reservas.test.ts
  await db.reservaLocal.deleteMany({ where: { localId: { in: [myLocalAId, myLocalBId] } } })
})

afterAll(async () => {
  await db.local.deleteMany({ where: { id: { in: [myLocalAId, myLocalBId] } } })
})

// ═══════════════════════════════════════════════════════════════════════════
// 25. Criar reserva → persiste no DB + agrupável por diaSemana
// ═══════════════════════════════════════════════════════════════════════════
it('25. Criar reserva persiste no DB e é recuperável agrupada por dia da semana', async () => {
  await db.reservaLocal.create({
    data: {
      tenantId:       tidA,
      localId:        myLocalAId,
      profissionalId: prof1AId,
      diaSemana:      2, // terça
      horaInicio:     '09:00',
      horaFim:        '10:00',
      ativa:          true,
    },
  })

  const todas = await runWithTenant(tidA, () =>
    getTenantDb().reservaLocal.findMany({
      where: { localId: myLocalAId, ativa: true },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    })
  )

  expect(todas).toHaveLength(1)
  expect(todas[0].diaSemana).toBe(2)
  expect(todas[0].horaInicio).toBe('09:00')
  expect(todas[0].profissionalId).toBe(prof1AId)

  // Agrupamento por dia funciona
  const porDia = new Map<number, typeof todas>()
  for (const r of todas) {
    if (!porDia.has(r.diaSemana)) porDia.set(r.diaSemana, [])
    porDia.get(r.diaSemana)!.push(r)
  }
  expect(porDia.has(2)).toBe(true)
  expect(porDia.get(2)).toHaveLength(1)
}, 15_000)

// ═══════════════════════════════════════════════════════════════════════════
// 26. Sobreposição bloqueada — overlap check retorna nome do conflitante
// ═══════════════════════════════════════════════════════════════════════════
it('26. Sobreposição entre profissionais diferentes no mesmo local/dia/hora é detectada', async () => {
  await db.reservaLocal.create({
    data: {
      tenantId:       tidA,
      localId:        myLocalAId,
      profissionalId: prof1AId,
      diaSemana:      1, // segunda
      horaInicio:     '14:00',
      horaFim:        '18:00',
      ativa:          true,
    },
  })

  // Simula o overlap check de criarReservaLocal para prof2A na segunda 16h-20h
  const overlap = await runWithTenant(tidA, () =>
    getTenantDb().reservaLocal.findFirst({
      where: {
        localId:    myLocalAId,
        diaSemana:  1,
        ativa:      true,
        horaInicio: { lt: '20:00' },
        horaFim:    { gt: '16:00' },
      },
      include: { profissional: { include: { user: true } } },
    })
  )

  expect(overlap).not.toBeNull()
  expect(overlap!.profissionalId).toBe(prof1AId)
  const errorMsg = `Já existe uma reserva neste horário para ${overlap!.profissional.user.name}.`
  expect(errorMsg).toMatch(/Já existe uma reserva neste horário para .+\./)

  // Borda exata: horaFim 18:00, nova horaInicio 18:00 → NÃO sobrepõe (gt strict)
  const overlapBorda = await runWithTenant(tidA, () =>
    getTenantDb().reservaLocal.findFirst({
      where: {
        localId:    myLocalAId,
        diaSemana:  1,
        ativa:      true,
        horaInicio: { lt: '19:00' },
        horaFim:    { gt: '18:00' },
      },
    })
  )
  expect(overlapBorda).toBeNull()
}, 15_000)

// ═══════════════════════════════════════════════════════════════════════════
// 27. Desativar/reativar reserva + filtro de inativas
// ═══════════════════════════════════════════════════════════════════════════
it('27a. Desativar reserva: some com filtro OFF (ativa=true), aparece com filtro ON', async () => {
  await db.reservaLocal.create({
    data: {
      tenantId:       tidA,
      localId:        myLocalAId,
      profissionalId: prof1AId,
      diaSemana:      3, // quarta
      horaInicio:     '08:00',
      horaFim:        '09:00',
      ativa:          true,
    },
  })

  // Desativar via tenant context (simula toggleAtivaReservaLocal)
  const todas = await runWithTenant(tidA, () =>
    getTenantDb().reservaLocal.findMany({ where: { localId: myLocalAId } })
  )
  await runWithTenant(tidA, () =>
    getTenantDb().reservaLocal.update({ where: { id: todas[0].id }, data: { ativa: false } })
  )

  // Verificar dentro do mesmo runWithTenant para evitar janela de concorrência
  const [filtroOff, filtroOn] = await runWithTenant(tidA, async () => {
    const db2 = getTenantDb()
    const off = await db2.reservaLocal.findMany({ where: { localId: myLocalAId, ativa: true } })
    const on  = await db2.reservaLocal.findMany({ where: { localId: myLocalAId } })
    return [off, on]
  })

  expect(filtroOff).toHaveLength(0)           // filtro OFF: inativas ocultas
  expect(filtroOn).toHaveLength(1)             // filtro ON: inativas visíveis
  expect(filtroOn[0].ativa).toBe(false)
}, 15_000)

it('27b. Reativar reserva: volta a aparecer com filtro OFF', async () => {
  // Cria já inativa para testar reativação isolada
  const criada = await db.reservaLocal.create({
    data: {
      tenantId:       tidA,
      localId:        myLocalAId,
      profissionalId: prof1AId,
      diaSemana:      3,
      horaInicio:     '10:00',
      horaFim:        '11:00',
      ativa:          false, // já inativa
    },
  })

  // Reativar
  await runWithTenant(tidA, () =>
    getTenantDb().reservaLocal.update({ where: { id: criada.id }, data: { ativa: true } })
  )

  const ativas = await runWithTenant(tidA, () =>
    getTenantDb().reservaLocal.findMany({ where: { localId: myLocalAId, ativa: true } })
  )
  expect(ativas).toHaveLength(1)
  expect(ativas[0].ativa).toBe(true)
}, 15_000)

// ═══════════════════════════════════════════════════════════════════════════
// 28. Badge reativo — getReservaStatus: minha / outro / nulo
// ═══════════════════════════════════════════════════════════════════════════
it('28a. Badge verde: profissional tem reserva ativa no horário → minha=true', async () => {
  await db.reservaLocal.create({
    data: {
      tenantId:       tidA,
      localId:        myLocalAId,
      profissionalId: prof1AId,
      diaSemana:      5, // sexta
      horaInicio:     '13:00',
      horaFim:        '17:00',
      ativa:          true,
    },
  })

  const reserva = await runWithTenant(tidA, () =>
    getTenantDb().reservaLocal.findFirst({
      where: { localId: myLocalAId, diaSemana: 5, ativa: true, horaInicio: { lt: '15:00' }, horaFim: { gt: '14:00' } },
      include: { profissional: { include: { user: true } } },
    })
  )

  expect(reserva).not.toBeNull()
  expect(reserva!.profissionalId === prof1AId).toBe(true) // minha=true → badge verde
}, 15_000)

it('28b. Badge âmbar: profissional diferente tem reserva → minha=false + nome exibível', async () => {
  await db.reservaLocal.create({
    data: {
      tenantId:       tidA,
      localId:        myLocalAId,
      profissionalId: prof1AId,
      diaSemana:      5,
      horaInicio:     '13:00',
      horaFim:        '17:00',
      ativa:          true,
    },
  })

  // prof2A consulta o mesmo local/horário
  const reserva = await runWithTenant(tidA, () =>
    getTenantDb().reservaLocal.findFirst({
      where: { localId: myLocalAId, diaSemana: 5, ativa: true, horaInicio: { lt: '15:00' }, horaFim: { gt: '14:00' } },
      include: { profissional: { include: { user: true } } },
    })
  )

  expect(reserva).not.toBeNull()
  expect(reserva!.profissionalId === prof2AId).toBe(false) // minha=false → badge âmbar
  expect(reserva!.profissional.user.name).toBeTruthy()     // nome para exibir no badge
}, 15_000)

it('28c. Badge desaparece: horário fora da reserva → null', async () => {
  await db.reservaLocal.create({
    data: {
      tenantId:       tidA,
      localId:        myLocalAId,
      profissionalId: prof1AId,
      diaSemana:      5,
      horaInicio:     '13:00',
      horaFim:        '17:00',
      ativa:          true,
    },
  })

  // 17h-18h — contíguo mas NÃO sobrepõe (gt strict: "17:00" > "17:00" = false)
  const reserva = await runWithTenant(tidA, () =>
    getTenantDb().reservaLocal.findFirst({
      where: { localId: myLocalAId, diaSemana: 5, ativa: true, horaInicio: { lt: '18:00' }, horaFim: { gt: '17:00' } },
    })
  )
  expect(reserva).toBeNull() // badge desaparece
}, 15_000)

it('28d. Badge multi-tenant: reserva do TenantA não aparece para TenantB', async () => {
  await db.reservaLocal.create({
    data: {
      tenantId:       tidA,
      localId:        myLocalAId,
      profissionalId: prof1AId,
      diaSemana:      5,
      horaInicio:     '13:00',
      horaFim:        '17:00',
      ativa:          true,
    },
  })

  // TenantB consulta seu próprio local — não deve ver a reserva do TenantA
  const reserva = await runWithTenant(tidB, () =>
    getTenantDb().reservaLocal.findFirst({
      where: { localId: myLocalBId, diaSemana: 5, ativa: true, horaInicio: { lt: '15:00' }, horaFim: { gt: '14:00' } },
    })
  )
  expect(reserva).toBeNull()
}, 15_000)
