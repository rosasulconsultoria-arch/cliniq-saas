/**
 * Suite E2E — Fluxo de Signup (Lote E2)
 *
 * Testa as server actions de signup contra o banco real (schema=test_schema).
 * Mocka cookie state e email para isolar dependências de HTTP.
 * Cada teste cria e limpa seus próprios SignupDrafts.
 *
 * Numeração: sequência após reservas-ui.test.ts (32+)
 */

import { it, expect, beforeEach, afterAll, vi } from 'vitest'
import { db } from '@/lib/db'

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockDraftId: string | null = null

vi.mock('@/lib/signup/state', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/signup/state')>()
  return {
    ...actual,
    getCurrentDraftId: async () => mockDraftId,
    setCurrentDraftId: async (id: string) => {
      mockDraftId = id
    },
    clearDraft: async () => {
      mockDraftId = null
    },
  }
})

vi.mock('@/lib/signup/email-templates', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ emailEnviado: false }),
}))

// ── Cleanup ────────────────────────────────────────────────────────────────────

const createdDraftIds: string[] = []

beforeEach(() => {
  mockDraftId = null
})

afterAll(async () => {
  if (createdDraftIds.length > 0) {
    await db.signupDraft.deleteMany({
      where: { id: { in: createdDraftIds } },
    })
  }
})

// ── Helpers ────────────────────────────────────────────────────────────────────

async function criarDraftBase(extra?: Partial<Parameters<typeof db.signupDraft.create>[0]['data']>) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const draft = await db.signupDraft.create({
    data: { expiresAt, ...extra },
  })
  createdDraftIds.push(draft.id)
  return draft
}

// ── Testes ─────────────────────────────────────────────────────────────────────

it('1. escolherPlano cria draft com planoId e periodicidade corretos', async () => {
  const { escolherPlano } = await import('@/app/(public)/signup/actions')

  const result = await escolherPlano({ planoId: 'PROFISSIONAL', periodicidade: 'ANUAL' })

  expect(result.success).toBe(true)
  expect(mockDraftId).not.toBeNull()
  createdDraftIds.push(mockDraftId!)

  const draft = await db.signupDraft.findUnique({ where: { id: mockDraftId! } })
  expect(draft?.planoId).toBe('PROFISSIONAL')
  expect(draft?.periodicidade).toBe('ANUAL')
  expect(draft?.step).toBe(0)
})

it('2. salvarClinica atualiza draft com step=1 quando slug válido', async () => {
  const { salvarClinica } = await import('@/app/(public)/signup/actions')

  const draft = await criarDraftBase({ planoId: 'BASICO', periodicidade: 'MENSAL', step: 0 })
  mockDraftId = draft.id

  const slug = `test-clinica-e2-${Date.now()}`
  const result = await salvarClinica({
    nomeClinica: 'Clínica Teste E2',
    slug,
    especialidade: 'PSICOLOGIA',
    telefone: '(11) 99999-9999',
  })

  expect(result.success).toBe(true)

  const updated = await db.signupDraft.findUnique({ where: { id: draft.id } })
  expect(updated?.nomeClinica).toBe('Clínica Teste E2')
  expect(updated?.slug).toBe(slug)
  expect(updated?.step).toBe(1)
})

it('3. validarSlug retorna sugestões quando slug está indisponível', async () => {
  const { validarSlug } = await import('@/app/(public)/signup/actions')

  const slug = `slug-ocupado-${Date.now()}`
  const draft = await criarDraftBase({ slug, step: 1 })
  mockDraftId = draft.id

  const result = await validarSlug(slug)

  expect(result.available).toBe(false)
  expect(result.suggestions).toBeDefined()
  expect(result.suggestions!.length).toBeGreaterThan(0)
  expect(result.suggestions!.every((s) => !s.includes(slug) || s !== slug)).toBe(true)
})

it('4. validarSlug bloqueia slug reservado sem sugestões', async () => {
  const { validarSlug } = await import('@/app/(public)/signup/actions')

  const result = await validarSlug('admin')

  expect(result.available).toBe(false)
  expect(result.suggestions).toBeUndefined()
})

it('5. salvarAdmin atualiza draft com step=2, hash de senha e token de email', async () => {
  const { salvarAdmin } = await import('@/app/(public)/signup/actions')

  const draft = await criarDraftBase({
    planoId: 'PROFISSIONAL',
    periodicidade: 'ANUAL',
    nomeClinica: 'Clínica Admin Test',
    slug: `admin-test-${Date.now()}`,
    especialidade: 'PSICOLOGIA',
    step: 1,
  })
  mockDraftId = draft.id

  const result = await salvarAdmin({
    nomeAdmin: 'Dr. Admin',
    emailAdmin: `test-${Date.now()}@example.com`,
    senha: 'Senha@123Forte',
    confirmacaoSenha: 'Senha@123Forte',
    termosAceitos: true,
  })

  expect(result.success).toBe(true)

  const updated = await db.signupDraft.findUnique({ where: { id: draft.id } })
  expect(updated?.step).toBe(2)
  expect(updated?.passwordHash).not.toBeNull()
  expect(updated?.emailToken).not.toBeNull()
  expect(updated?.emailTokenExp).not.toBeNull()
  expect(updated?.lastEmailSentAt).not.toBeNull()
})

it('6. verificarEmailToken com token válido marca emailVerificado=true', async () => {
  const { verificarEmailToken } = await import('@/app/(public)/signup/actions')

  const token = `valid-token-${Date.now()}`
  const draft = await criarDraftBase({
    planoId: 'BASICO',
    periodicidade: 'MENSAL',
    nomeClinica: 'Clínica Token Test',
    slug: `token-test-${Date.now()}`,
    step: 2,
    emailAdmin: 'token@example.com',
    emailToken: token,
    emailTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  const result = await verificarEmailToken(token)

  expect(result.success).toBe(true)
  expect(result.error).toBeUndefined()
  expect(mockDraftId).toBe(draft.id)

  const updated = await db.signupDraft.findUnique({ where: { id: draft.id } })
  expect(updated?.emailVerificado).toBe(true)
  expect(updated?.emailTokenUsed).toBe(true)
})

it('7. verificarEmailToken com token expirado retorna error=expired', async () => {
  const { verificarEmailToken } = await import('@/app/(public)/signup/actions')

  const token = `expired-token-${Date.now()}`
  await criarDraftBase({
    step: 2,
    emailAdmin: 'expired@example.com',
    emailToken: token,
    emailTokenExp: new Date(Date.now() - 1000),
  })

  const result = await verificarEmailToken(token)

  expect(result.success).toBe(false)
  expect(result.error).toBe('expired')
})

it('8. verificarEmailToken com token já usado retorna error=used', async () => {
  const { verificarEmailToken } = await import('@/app/(public)/signup/actions')

  const token = `used-token-${Date.now()}`
  await criarDraftBase({
    step: 2,
    emailAdmin: 'used@example.com',
    emailToken: token,
    emailTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000),
    emailTokenUsed: true,
    emailVerificado: true,
  })

  const result = await verificarEmailToken(token)

  expect(result.success).toBe(false)
  expect(result.error).toBe('used')
})

it('9. verificarEmailToken com token inexistente retorna error=invalid', async () => {
  const { verificarEmailToken } = await import('@/app/(public)/signup/actions')

  const result = await verificarEmailToken('nao-existe-nunca-123456789')

  expect(result.success).toBe(false)
  expect(result.error).toBe('invalid')
})
