import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @prisma/client — validators.ts uses nativeEnum(PlanoTenant) and nativeEnum(Periodicidade)
vi.mock('@prisma/client', () => ({
  PlanoTenant: { BASICO: 'BASICO', PRO: 'PRO', ENTERPRISE: 'ENTERPRISE' },
  Periodicidade: { MENSAL: 'MENSAL', ANUAL: 'ANUAL' },
}))

// Mock next/headers (async cookies in Next.js 14)
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

// Mock the entire state module
vi.mock('@/lib/signup/state', () => ({
  createDraft: vi.fn(),
  getDraft: vi.fn(),
  getCurrentDraftId: vi.fn(),
  setCurrentDraftId: vi.fn(),
  updateDraft: vi.fn(),
  markFinalized: vi.fn(),
  cleanupExpiredDrafts: vi.fn(),
}))

// Mock db (for validarSlug — checks db.tenant and db.signupDraft)
vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(),
    },
    signupDraft: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock email
vi.mock('@/lib/signup/email-templates', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ emailEnviado: false }),
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}))

import {
  validarSlug,
  salvarClinica,
  verificarEmailToken,
  reenviarEmailVerificacao,
} from '@/app/(public)/signup/actions'
import { db } from '@/lib/db'
import {
  getCurrentDraftId,
  getDraft,
  updateDraft,
  setCurrentDraftId,
} from '@/lib/signup/state'

const mockDb = db as any
const mockGetCurrentDraftId = getCurrentDraftId as ReturnType<typeof vi.fn>
const mockGetDraft = getDraft as ReturnType<typeof vi.fn>
const mockUpdateDraft = updateDraft as ReturnType<typeof vi.fn>
const mockSetCurrentDraftId = setCurrentDraftId as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('validarSlug', () => {
  it('retorna available=false para slug reservado', async () => {
    const result = await validarSlug('admin')
    expect(result.available).toBe(false)
    // Reserved slugs: no DB queries needed
    expect(mockDb.tenant.findUnique).not.toHaveBeenCalled()
  })

  it('retorna available=false para slug usado em Tenant existente', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', slug: 'minha-clinica' })
    mockDb.signupDraft.findFirst.mockResolvedValue(null)

    const result = await validarSlug('minha-clinica')
    expect(result.available).toBe(false)
    expect(result.suggestions).toBeDefined()
  })

  it('retorna available=false para slug usado em SignupDraft ativo', async () => {
    mockDb.tenant.findUnique.mockResolvedValue(null)
    mockDb.signupDraft.findFirst.mockResolvedValue({ id: 'draft-1', slug: 'minha-clinica' })

    const result = await validarSlug('minha-clinica')
    expect(result.available).toBe(false)
    expect(result.suggestions).toBeDefined()
  })

  it('retorna sugestões quando slug indisponível', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', slug: 'ocupado' })
    mockDb.signupDraft.findFirst.mockResolvedValue(null)

    const result = await validarSlug('ocupado')
    expect(result.available).toBe(false)
    expect(Array.isArray(result.suggestions)).toBe(true)
    expect(result.suggestions!.length).toBeGreaterThan(0)
  })
})

describe('salvarClinica', () => {
  it('falha se slug já está ocupado', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' })
    mockDb.signupDraft.findFirst.mockResolvedValue(null)
    mockGetCurrentDraftId.mockResolvedValue('draft-123')

    const result = await salvarClinica({
      nomeClinica: 'Clínica Boa',
      slug: 'clinica-boa',
      especialidade: 'PSICOLOGIA',
      telefone: '(11) 99999-9999',
    })

    expect(result.success).toBe(false)
    expect(result.errors?.slug).toBeDefined()
  })
})

describe('verificarEmailToken', () => {
  it('falha para token expirado', async () => {
    const expiredDate = new Date(Date.now() - 1000) // 1s in the past
    mockDb.signupDraft.findFirst.mockResolvedValue({
      id: 'draft-1',
      emailToken: 'expired-token',
      emailTokenExp: expiredDate,
      emailVerificado: false,
    })

    const result = await verificarEmailToken('expired-token')
    expect(result.success).toBe(false)
    expect(result.error).toBe('expired')
  })

  it('sucesso marca emailVerificado=true', async () => {
    const validDate = new Date(Date.now() + 60 * 60 * 1000) // 1h in future
    mockDb.signupDraft.findFirst.mockResolvedValue({
      id: 'draft-1',
      emailToken: 'valid-token',
      emailTokenExp: validDate,
      emailVerificado: false,
    })
    mockDb.signupDraft.update.mockResolvedValue({ id: 'draft-1', emailVerificado: true })
    mockSetCurrentDraftId.mockResolvedValue(undefined)

    const result = await verificarEmailToken('valid-token')
    expect(result.success).toBe(true)
    expect(result.draftId).toBe('draft-1')
    expect(mockDb.signupDraft.update).toHaveBeenCalledWith({
      where: { id: 'draft-1' },
      data: { emailVerificado: true, emailTokenUsed: true },
    })
  })
})

describe('reenviarEmailVerificacao', () => {
  it('respeita cooldown de 60 segundos', async () => {
    const recentlySent = new Date(Date.now() - 30 * 1000) // 30s ago
    mockGetCurrentDraftId.mockResolvedValue('draft-1')
    mockGetDraft.mockResolvedValue({
      id: 'draft-1',
      emailAdmin: 'test@test.com',
      nomeClinica: 'Clínica Test',
      lastEmailSentAt: recentlySent,
      emailVerificado: false,
    })

    const result = await reenviarEmailVerificacao()
    expect(result.success).toBe(false)
    expect(result.cooldownSegundos).toBeGreaterThan(0)
    expect(result.cooldownSegundos).toBeLessThanOrEqual(60)
  })
})
