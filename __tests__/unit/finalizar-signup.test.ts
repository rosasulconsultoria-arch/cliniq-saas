import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calcularTrialEndsAt, calcularNextDueDate } from '@/lib/asaas-saas'

// Mock de módulos usados pela action (não chamamos o Asaas real)
vi.mock('@/lib/db', () => ({
  db: {
    signupDraft: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    user: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/signup/state', () => ({
  getCurrentDraftId: vi.fn(),
  getDraft: vi.fn(),
  updateDraft: vi.fn(),
  clearDraft: vi.fn(),
}))

vi.mock('@/lib/asaas-saas', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/asaas-saas')>()
  return {
    ...real,
    createCustomer: vi.fn(),
    createSubscription: vi.fn(),
    deleteCustomer: vi.fn(),
  }
})

vi.mock('next-auth/jwt', () => ({ encode: vi.fn().mockResolvedValue('mock_jwt_token') }))
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ set: vi.fn(), delete: vi.fn() }),
}))

import { db } from '@/lib/db'
import { getCurrentDraftId, getDraft, updateDraft } from '@/lib/signup/state'
import { finalizarSignup } from '@/app/(public)/signup/actions'

const draftBase = {
  id: 'draft_test',
  planoId: 'PROFISSIONAL',
  periodicidade: 'MENSAL',
  slug: 'test-clinica',
  nomeClinica: 'Clínica Teste',
  nomeAdmin: 'Dr. Teste',
  emailAdmin: 'admin@test.com',
  passwordHash: '$2b$12$hash',
  emailVerificado: true,
  emailTokenUsed: true,
  finalized: false,
  finalizing: false,
  asaasCustomerId: null,
  asaasSubscriptionId: null,
  updatedAt: new Date(),
  step: 3,
  expiresAt: new Date(Date.now() + 86400000),
}

const dadosCartao = {
  holderName: 'DR TESTE',
  number: '5162306219378829',
  expiryMonth: '05',
  expiryYear: '2028',
  ccv: '318',
  cpfCnpj: '12345678901',
  postalCode: '01310100',
  addressNumber: '100',
  phone: '11999998888',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('finalizarSignup — guards', () => {
  it('falha se não há draftId no cookie', async () => {
    vi.mocked(getCurrentDraftId).mockResolvedValueOnce(null)

    const result = await finalizarSignup(dadosCartao)

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Sessão expirada')
  })

  it('falha se email não verificado', async () => {
    vi.mocked(getCurrentDraftId).mockResolvedValueOnce('draft_test')
    vi.mocked(getDraft).mockResolvedValueOnce({
      ...draftBase,
      emailVerificado: false,
    } as any)

    const result = await finalizarSignup(dadosCartao)

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('E-mail não verificado')
  })

  it('retorna sucesso idempotente se draft já finalizado', async () => {
    vi.mocked(getCurrentDraftId).mockResolvedValueOnce('draft_test')
    vi.mocked(getDraft).mockResolvedValueOnce({
      ...draftBase,
      finalized: true,
      slug: 'test-clinica',
    } as any)
    vi.mocked(db.tenant.findFirst as any).mockResolvedValueOnce({
      id: 'ten_abc',
      slug: 'test-clinica',
    })

    const result = await finalizarSignup(dadosCartao)

    expect(result.success).toBe(true)
    expect((result as any).slug).toBe('test-clinica')
  })

  it('falha se finalizing=true e lock ainda ativo (< 5 min)', async () => {
    vi.mocked(getCurrentDraftId).mockResolvedValueOnce('draft_test')
    vi.mocked(getDraft).mockResolvedValueOnce({
      ...draftBase,
      finalizing: true,
      updatedAt: new Date(), // lock recente
    } as any)

    const result = await finalizarSignup(dadosCartao)

    expect(result.success).toBe(false)
    expect((result as any).error).toContain('Processamento em andamento')
  })
})

describe('calcularTrialEndsAt', () => {
  it('retorna data 14 dias à frente', () => {
    const hoje = new Date()
    const trial = calcularTrialEndsAt(14)
    const diffDias = Math.round((trial.getTime() - hoje.getTime()) / 86400000)
    expect(diffDias).toBe(14)
  })

  it('calcularNextDueDate retorna string ISO date no formato YYYY-MM-DD', () => {
    const result = calcularNextDueDate(14)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
