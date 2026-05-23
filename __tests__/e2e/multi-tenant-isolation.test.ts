/**
 * Suite E2E — Isolamento Multi-tenant
 *
 * Roda contra DATABASE_URL_TEST (schema=test_schema).
 * Setup (globalSetup) garante que schema != public antes de qualquer teste.
 *
 * Cobertura dos 5 padrões do ARCHITECTURE.md:
 *   Padrão 1 ($queryRaw)       → Cenário 18
 *   Padrão 2 (AgendamentoServico SKIP_TENANT) → Cenário 20
 *   Padrão 3 (Parcela SKIP_TENANT)            → Cenário 19
 *   Padrão 4 (findFirst em vez de findUnique) → Cenários 11, 12
 *   Padrão 5 ($transaction com tenant)        → Cenário 16
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { db } from '@/lib/db'
import { getTenantDb } from '@/lib/prisma'
import { runWithTenant, runWithoutTenant, getTenantId } from '@/lib/tenant-context'

// ── Referências ao seed ────────────────────────────────────────────────────
// (consultadas por slug no beforeAll — não dependem de arquivo externo)

let tidA: string, tidB: string
let prof1AId: string, prof1BId: string
let prof2AId: string // slug "dr-a-only"
let sala_aId: string, sala_bId: string
let pac1AId: string, pac1BId: string  // mesmo CPF 11111111111
let pac2AId: string
let agend1AId: string, agend1BId: string
let parc1AId: string       // parcelamento do TenantA
let parcelaAId: string     // 1ª parcela do parcelamento do TenantA
let servico1AId: string

beforeAll(async () => {
  const tA = await db.tenant.findUnique({ where: { slug: 'clinic-a' } })
  const tB = await db.tenant.findUnique({ where: { slug: 'clinic-b' } })
  if (!tA || !tB) throw new Error('Seed não encontrado. Rode setup primeiro.')

  tidA = tA.id
  tidB = tB.id

  // Profissionais
  const [p1A] = await db.profissional.findMany({ where: { tenantId: tidA, slugAgendamento: 'dr-test' } })
  const [p2A] = await db.profissional.findMany({ where: { tenantId: tidA, slugAgendamento: 'dr-a-only' } })
  const [p1B] = await db.profissional.findMany({ where: { tenantId: tidB, slugAgendamento: 'dr-test' } })
  prof1AId = p1A.id; prof2AId = p2A.id; prof1BId = p1B.id

  // Locais
  const [sA] = await db.local.findMany({ where: { tenantId: tidA } })
  const [sB] = await db.local.findMany({ where: { tenantId: tidB } })
  sala_aId = sA.id; sala_bId = sB.id

  // Pacientes
  const [pA1] = await db.paciente.findMany({ where: { tenantId: tidA, cpf: '11111111111' } })
  const [pB1] = await db.paciente.findMany({ where: { tenantId: tidB, cpf: '11111111111' } })
  const [pA2] = await db.paciente.findMany({ where: { tenantId: tidA, cpf: '22222222222' } })
  pac1AId = pA1.id; pac1BId = pB1.id; pac2AId = pA2.id

  // Agendamentos
  const agsA = await db.agendamento.findMany({ where: { tenantId: tidA }, take: 1 })
  const agsB = await db.agendamento.findMany({ where: { tenantId: tidB }, take: 1 })
  agend1AId = agsA[0].id; agend1BId = agsB[0].id

  // Parcelamento + Parcela do TenantA
  const [parcA] = await db.parcelamento.findMany({ where: { tenantId: tidA }, take: 1 })
  parc1AId = parcA.id
  const [parcelaA] = await db.parcela.findMany({ where: { parcelamentoId: parc1AId }, take: 1 })
  parcelaAId = parcelaA.id

  // Servico do TenantA
  const [svcA] = await db.servico.findMany({ where: { tenantId: tidA }, take: 1 })
  servico1AId = svcA.id
}, 30_000)

// ═══════════════════════════════════════════════════════════════════════════
// Grupo 1 — Isolamento básico (reads)
// ═══════════════════════════════════════════════════════════════════════════
describe('Grupo 1 — Isolamento básico (reads)', () => {
  it('1. findMany de pacientes retorna SÓ os 3 do TenantA', async () => {
    const pacientes = await runWithTenant(tidA, () => getTenantDb().paciente.findMany())
    expect(pacientes).toHaveLength(3)
    expect(pacientes.every(p => p.tenantId === tidA)).toBe(true)
    expect(pacientes.some(p => p.nome.startsWith('Paciente B'))).toBe(false)
  })

  it('2. findMany de profissionais retorna SÓ os 2 do TenantA', async () => {
    const profs = await runWithTenant(tidA, () => getTenantDb().profissional.findMany())
    expect(profs).toHaveLength(2)
    expect(profs.every(p => p.tenantId === tidA)).toBe(true)
  })

  it('3. findMany de agendamentos retorna SÓ os 5 do TenantA', async () => {
    const ags = await runWithTenant(tidA, () => getTenantDb().agendamento.findMany())
    expect(ags).toHaveLength(5)
    expect(ags.every(a => a.tenantId === tidA)).toBe(true)
  })

  it('4. Total de pacientes é 3 no TenantA e 3 no TenantB — nunca 6', async () => {
    const [cA, cB, total] = await Promise.all([
      runWithTenant(tidA, () => getTenantDb().paciente.count()),
      runWithTenant(tidB, () => getTenantDb().paciente.count()),
      db.paciente.count(), // raw — vê todos os schemas/tenants
    ])
    expect(cA).toBe(3)
    expect(cB).toBe(3)
    expect(total).toBe(6)             // 6 ao total no banco
    expect(cA + cB).toBe(total)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Grupo 2 — Isolamento em writes
// ═══════════════════════════════════════════════════════════════════════════
describe('Grupo 2 — Isolamento em writes', () => {
  it('5. Operação fora de contexto de tenant lança [TenantContext] explicitamente', () => {
    expect(() => getTenantId()).toThrow('[TenantContext]')
  })

  it('6. Criar agendamento no TenantA → tenantId = tidA, nunca tidB', async () => {
    const agendCriado = await runWithTenant(tidA, async () => {
      const prisma = getTenantDb()
      return prisma.agendamento.create({
        data: {
          profissionalId: prof1AId,
          pacienteId:     pac2AId,
          localId:        sala_aId,
          dataHoraInicio: new Date('2026-07-01T10:00:00'),
          dataHoraFim:    new Date('2026-07-01T10:50:00'),
          status:         'AGENDADO',
          valor:          200,
          origem:         'INTERNO',
        },
      })
    })

    expect(agendCriado.tenantId).toBe(tidA)
    expect(agendCriado.tenantId).not.toBe(tidB)

    // Cleanup
    await db.agendamento.delete({ where: { id: agendCriado.id } })
  })

  it('7. Editar paciente do TenantB no contexto do TenantA → P2025 (record not found)', async () => {
    const nomeOriginal = (await db.paciente.findUnique({ where: { id: pac1BId } }))!.nome

    await expect(
      runWithTenant(tidA, async () => {
        const prisma = getTenantDb()
        // Extension injeta tenantId = tidA → WHERE id = pac1BId AND tenantId = tidA → 0 rows → P2025
        return prisma.paciente.update({
          where: { id: pac1BId },
          data:  { nome: 'Hackeado pelo TenantA' },
        })
      })
    ).rejects.toThrow() // P2025

    // Confirmar que o registro do TenantB está intacto
    const depois = await db.paciente.findUnique({ where: { id: pac1BId } })
    expect(depois!.nome).toBe(nomeOriginal)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Grupo 3 — Validações de unicidade tenant-scoped
// ═══════════════════════════════════════════════════════════════════════════
describe('Grupo 3 — Unicidade @@unique([campo, tenantId])', () => {
  it('8. Mesmo CPF em TenantA e TenantB → ambos os registros existem sem conflito', async () => {
    const [pA, pB] = await Promise.all([
      db.paciente.findUnique({ where: { id: pac1AId } }),
      db.paciente.findUnique({ where: { id: pac1BId } }),
    ])
    expect(pA!.cpf).toBe('11111111111')
    expect(pB!.cpf).toBe('11111111111')
    expect(pA!.tenantId).toBe(tidA)
    expect(pB!.tenantId).toBe(tidB)
    expect(pA!.id).not.toBe(pB!.id) // registros distintos
  })

  it('9. Mesmo slugAgendamento "dr-test" em dois tenants → ambos existem sem conflito', async () => {
    const [p1A, p1B] = await Promise.all([
      db.profissional.findUnique({ where: { id: prof1AId } }),
      db.profissional.findUnique({ where: { id: prof1BId } }),
    ])
    expect(p1A!.slugAgendamento).toBe('dr-test')
    expect(p1B!.slugAgendamento).toBe('dr-test')
    expect(p1A!.tenantId).toBe(tidA)
    expect(p1B!.tenantId).toBe(tidB)
    expect(p1A!.id).not.toBe(p1B!.id)
  })

  it('10. Email "shared@clinic-test.com" em TenantA e TenantB → ambos válidos, registros distintos', async () => {
    const [uA, uB] = await Promise.all([
      runWithTenant(tidA, () => getTenantDb().user.findFirst({ where: { email: 'shared@clinic-test.com' } })),
      runWithTenant(tidB, () => getTenantDb().user.findFirst({ where: { email: 'shared@clinic-test.com' } })),
    ])
    expect(uA).not.toBeNull()
    expect(uB).not.toBeNull()
    expect(uA!.tenantId).toBe(tidA)
    expect(uB!.tenantId).toBe(tidB)
    expect(uA!.id).not.toBe(uB!.id)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Grupo 4 — Rotas públicas isoladas (simulação DB layer)
// ═══════════════════════════════════════════════════════════════════════════
describe('Grupo 4 — Rotas públicas isoladas', () => {
  it('11. Acessar "dr-test" via TenantA → encontra o profissional do TenantA (Padrão 4: findFirst)', async () => {
    // Simula o que agendar/[slug]/page.tsx faz: findFirst com extension injetando tenantId
    const prof = await runWithTenant(tidA, () =>
      getTenantDb().profissional.findFirst({ where: { slugAgendamento: 'dr-test' } })
    )
    expect(prof).not.toBeNull()
    expect(prof!.tenantId).toBe(tidA)
    expect(prof!.id).toBe(prof1AId)
  })

  it('12. Acessar "dr-a-only" via TenantB → null (404 — profissional não pertence ao TenantB)', async () => {
    // "dr-a-only" existe SÓ no TenantA. Via subdomínio do TenantB, extension filtra por tidB → null
    const prof = await runWithTenant(tidB, () =>
      getTenantDb().profissional.findFirst({ where: { slugAgendamento: 'dr-a-only' } })
    )
    expect(prof).toBeNull()
  })

  it('13. Token de cancelamento do TenantA não funciona no contexto do TenantB', async () => {
    // agend1AId pertence ao TenantA. No contexto do TenantB, extension injeta tidB → null
    const agendamento = await runWithTenant(tidB, () =>
      getTenantDb().agendamento.findUnique({ where: { id: agend1AId } })
    )
    // Opção B: findUnique com tenantId = tidB → não encontra o agendamento do TenantA
    expect(agendamento).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Grupo 5 — Auth cross-tenant
// ═══════════════════════════════════════════════════════════════════════════
describe('Grupo 5 — Auth cross-tenant', () => {
  it('14. Login de admin-a via subdomínio do TenantB → null (sem auth cross-tenant)', async () => {
    // Simula o que lib/auth.ts faz: db.user.findFirst({ where: { email, tenantId } })
    // email 'admin-clinic-a@clinic-test.com' existe apenas no TenantA
    const user = await runWithTenant(tidB, () =>
      getTenantDb().user.findFirst({ where: { email: 'admin-clinic-a@clinic-test.com' } })
    )
    // Extension injeta tidB → não encontra o usuário do TenantA
    expect(user).toBeNull()
  })

  it('15. Recuperação de senha via subdomínio errado → usuário não encontrado no contexto', async () => {
    // Setar reset token no usuário do TenantA
    const adminA = await db.user.findFirst({ where: { tenantId: tidA, email: 'admin-clinic-a@clinic-test.com' } })
    const tokenFake = 'token-resetA-' + Date.now()
    await db.user.update({
      where: { id: adminA!.id },
      data:  { resetToken: tokenFake, resetTokenExpiry: new Date(Date.now() + 3600_000) },
    })

    // Tentar recuperar senha no contexto do TenantB (subdomínio errado)
    const user = await runWithTenant(tidB, () =>
      getTenantDb().user.findFirst({
        where: { resetToken: tokenFake, resetTokenExpiry: { gt: new Date() } },
      })
    )
    // Extension injeta tidB → não encontra o user do TenantA mesmo com token válido
    expect(user).toBeNull()

    // Cleanup: remover token
    await db.user.update({ where: { id: adminA!.id }, data: { resetToken: null, resetTokenExpiry: null } })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Grupo 6 — Server Actions de mutação
// ═══════════════════════════════════════════════════════════════════════════
describe('Grupo 6 — Server Actions de mutação', () => {
  it('16. Criar registro via $transaction no TenantA → tenantId correto (Padrão 5)', async () => {
    const nova = await runWithTenant(tidA, async () => {
      const prisma = getTenantDb()
      // Simula o que pagarAluguel faz: $transaction com injeção automática
      return prisma.$transaction(async (tx) => {
        return tx.categoriaFinanceira.create({
          data: { nome: 'Cat TX Test', tipo: 'DESPESA', cor: '#ff0000' },
        })
      })
    })

    expect(nova.tenantId).toBe(tidA)

    // Cleanup
    await db.categoriaFinanceira.delete({ where: { id: nova.id } })
  })

  it('17. Chamar getTenantDb() fora de withTenantAction → lança [TenantContext]', () => {
    // Sem runWithTenant: getTenantId() lança, bloqueando acesso a qualquer query
    expect(() => getTenantId()).toThrow('[TenantContext]')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Grupo 7 — Queries raw e relacionamentos especiais
// ═══════════════════════════════════════════════════════════════════════════
describe('Grupo 7 — Queries raw e relacionamentos especiais', () => {
  it('18. $queryRaw com tenantId explícito retorna SÓ dados do tenant correto (Padrão 1)', async () => {
    const tenantId = tidA
    // Padrão 1: $queryRaw NÃO é interceptado pela Extension — tenantId deve ser explícito
    const rows = await db.$queryRaw<{ nome: string; tenantId: string }[]>`
      SELECT nome, "tenantId" FROM "Paciente"
      WHERE "tenantId" = ${tenantId}
    `
    expect(rows).toHaveLength(3)
    expect(rows.every(r => r.tenantId === tidA)).toBe(true)
    expect(rows.some(r => r.tenantId === tidB)).toBe(false)

    // Sem filtro: retorna TODOS (6) — prova que Extension não intercepta raw
    const semFiltro = await db.$queryRaw<{ nome: string }[]>`SELECT nome FROM "Paciente"`
    expect(semFiltro.length).toBeGreaterThanOrEqual(6)
  })

  it('19. Parcela filtrada via parcelamento.tenantId — não retorna parcelas de outro tenant (Padrão 3)', async () => {
    // Padrão 3: Parcela é SKIP_TENANT — filtramos via parcelamento.tenantId
    const parcelasA = await db.parcela.findMany({
      where: { parcelamento: { tenantId: tidA } },
    })
    const parcelasB = await db.parcela.findMany({
      where: { parcelamento: { tenantId: tidB } },
    })

    expect(parcelasA).toHaveLength(3)
    expect(parcelasB).toHaveLength(3)

    // Verificar que nenhuma parcela do TenantA aparece no filtro do TenantB
    const idsA = new Set(parcelasA.map(p => p.id))
    const idsB = new Set(parcelasB.map(p => p.id))
    expect([...idsA].some(id => idsB.has(id))).toBe(false)

    // Verificar que a parcela específica do TenantA é encontrada apenas no seu contexto
    const parcelaCorreta = parcelasA.find(p => p.id === parcelaAId)
    const parcelaErrada  = parcelasB.find(p => p.id === parcelaAId)
    expect(parcelaCorreta).not.toBeUndefined()
    expect(parcelaErrada).toBeUndefined()
  })

  it('20. AgendamentoServico filtrado via agendamento.tenantId — isolado por tenant (Padrão 2)', async () => {
    // Padrão 2: AgendamentoServico é SKIP_TENANT — filtrar via agendamento.tenantId
    const asA = await db.agendamentoServico.findMany({
      where: { agendamento: { tenantId: tidA } },
    })
    const asB = await db.agendamentoServico.findMany({
      where: { agendamento: { tenantId: tidB } },
    })

    expect(asA).toHaveLength(1) // 1 serviço vinculado ao agend1A
    expect(asB).toHaveLength(1)

    // Confirmar que o serviço vinculado é do tenant correto
    expect(asA[0].servicoId).toBe(servico1AId)

    // Sem filtro: retorna TODOS (2) — prova que Extension não intercepta AgendamentoServico
    const semFiltro = await db.agendamentoServico.findMany()
    expect(semFiltro).toHaveLength(2)

    // IDs dos dois conjuntos são disjuntos
    const agendIdsA = new Set(asA.map(a => a.agendamentoId))
    const agendIdsB = new Set(asB.map(a => a.agendamentoId))
    expect([...agendIdsA].some(id => agendIdsB.has(id))).toBe(false)
  })
})
