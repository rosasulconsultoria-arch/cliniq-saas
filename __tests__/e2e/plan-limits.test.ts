/**
 * Suite E2E — Limites de plano (locais e profissionais)
 *
 * Roda contra DATABASE_URL_TEST (schema=test_schema).
 * Cria tenants temporários com planos específicos e valida checkLimit
 * com contagens reais do banco.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { checkLimit } from '@/lib/plans'

// IDs dos tenants temporários criados para esta suite
let tidBasico: string
let tidProfissional: string
let tidEnterprise: string

// IDs de profissional seed para FK de locais (local precisa de tenantId)
// Não precisamos de profissional para Local, mas precisamos para Profissional limit tests

beforeAll(async () => {
  const basico = await db.tenant.create({
    data: { slug: 'plan-test-basico', nome: 'Plan Test Básico', plano: 'BASICO', status: 'ATIVO' },
  })
  tidBasico = basico.id

  const profissional = await db.tenant.create({
    data: { slug: 'plan-test-prof', nome: 'Plan Test Pro', plano: 'PROFISSIONAL', status: 'ATIVO' },
  })
  tidProfissional = profissional.id

  const enterprise = await db.tenant.create({
    data: { slug: 'plan-test-ent', nome: 'Plan Test Enterprise', plano: 'ENTERPRISE', status: 'ATIVO' },
  })
  tidEnterprise = enterprise.id
}, 30_000)

afterAll(async () => {
  // Remover em ordem de FK
  for (const tid of [tidBasico, tidProfissional, tidEnterprise]) {
    if (!tid) continue
    await db.local.deleteMany({ where: { tenantId: tid } })
    await db.profissional.deleteMany({ where: { tenantId: tid } })
    await db.user.deleteMany({ where: { tenantId: tid } })
    await db.tenant.delete({ where: { id: tid } })
  }
}, 30_000)

// ── Helper: criar local diretamente no DB ──────────────────────────────────
async function criarLocaisDb(tenantId: string, count: number): Promise<string[]> {
  const ids: string[] = []
  for (let i = 0; i < count; i++) {
    const local = await db.local.create({
      data: { tenantId, nome: `Local Teste ${i + 1}`, tipo: 'SALA', capacidade: 1, ativa: true },
    })
    ids.push(local.id)
  }
  return ids
}

// ── Helper: criar user+profissional diretamente no DB ─────────────────────
async function criarProfissionalDb(tenantId: string, idx: number) {
  const user = await db.user.create({
    data: {
      tenantId, name: `Prof Test ${idx}`,
      email: `prof-test-${tenantId.slice(0, 8)}-${idx}@test.com`,
      passwordHash: '$2b$04$placeholder', role: 'PROFISSIONAL', active: true,
    },
  })
  await db.profissional.create({
    data: {
      tenantId, userId: user.id, especialidade: 'Psicologia',
      tipoVinculo: 'COMISSIONADO', comissaoPercentual: 30,
      slugAgendamento: `prof-lim-${tenantId.slice(0, 8)}-${idx}`, ativo: true,
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Cenário 32 — BASICO: 10 locais permitidos
// ═══════════════════════════════════════════════════════════════════════════
it('32. Plano BASICO: criar 10 locais → todos permitidos pelo checkLimit', async () => {
  await criarLocaisDb(tidBasico, 10)
  const count = await db.local.count({ where: { tenantId: tidBasico } })
  expect(count).toBe(10)

  // Antes de criar o 10º, count era 9 — deve ser permitido
  const resultBefore = checkLimit('BASICO', 'locais', 9)
  expect(resultBefore.allowed).toBe(true)
}, 30_000)

// ═══════════════════════════════════════════════════════════════════════════
// Cenário 33 — BASICO: 11º local bloqueado com mensagem clara
// ═══════════════════════════════════════════════════════════════════════════
it('33. Plano BASICO: 11º local bloqueado com mensagem contendo nome do plano e limite', async () => {
  const count = await db.local.count({ where: { tenantId: tidBasico } })
  // Deve ter 10 do cenário anterior
  expect(count).toBe(10)

  const result = checkLimit('BASICO', 'locais', count)
  expect(result.allowed).toBe(false)
  expect(result.message).toContain('Básico')
  expect(result.message).toContain('10')
  expect(result.message).toContain('locais')
}, 15_000)

// ═══════════════════════════════════════════════════════════════════════════
// Cenário 34 — PROFISSIONAL: 20 locais permitidos, 21º bloqueado
// ═══════════════════════════════════════════════════════════════════════════
it('34. Plano PROFISSIONAL: permite 20 locais, bloqueia o 21º', async () => {
  await criarLocaisDb(tidProfissional, 20)
  const count = await db.local.count({ where: { tenantId: tidProfissional } })
  expect(count).toBe(20)

  // 19 → permitido
  expect(checkLimit('PROFISSIONAL', 'locais', 19).allowed).toBe(true)
  // 20 → bloqueado
  const result = checkLimit('PROFISSIONAL', 'locais', count)
  expect(result.allowed).toBe(false)
  expect(result.message).toContain('Profissional')
  expect(result.message).toContain('20')
}, 30_000)

// ═══════════════════════════════════════════════════════════════════════════
// Cenário 35 — ENTERPRISE: ilimitado (criar 50 → todos permitidos)
// ═══════════════════════════════════════════════════════════════════════════
it('35. Plano ENTERPRISE: 50 locais → ilimitado, nenhum bloqueio', async () => {
  await criarLocaisDb(tidEnterprise, 50)
  const count = await db.local.count({ where: { tenantId: tidEnterprise } })
  expect(count).toBe(50)

  // checkLimit com 50 e ilimitado → sempre allowed
  const result = checkLimit('ENTERPRISE', 'locais', count)
  expect(result.allowed).toBe(true)
  expect(result.limit).toBe('ilimitado')
  expect(result.message).toBeUndefined()
}, 30_000)

// ═══════════════════════════════════════════════════════════════════════════
// Cenário 36 — Limite de profissionais funciona igualmente
// ═══════════════════════════════════════════════════════════════════════════
it('36. Limite de profissionais: BASICO permite 1, bloqueia o 2º', async () => {
  await criarProfissionalDb(tidBasico, 1)
  const count = await db.profissional.count({ where: { tenantId: tidBasico } })
  expect(count).toBe(1)

  // 1 profissional existente → tentar criar outro é bloqueado
  const result = checkLimit('BASICO', 'profissionais', count)
  expect(result.allowed).toBe(false)
  expect(result.message).toContain('Básico')
  expect(result.message).toContain('1')
  expect(result.message).toContain('profissionais')

  // 0 → permitido
  expect(checkLimit('BASICO', 'profissionais', 0).allowed).toBe(true)
}, 15_000)
