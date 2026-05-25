import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers — factory must NOT reference outer variables (vi.mock is hoisted)
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }),
}))

// Mock db — same rule: inline vi.fn() only
vi.mock('@/lib/db', () => ({
  db: {
    signupDraft: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { createDraft, updateDraft, cleanupExpiredDrafts } from '@/lib/signup/state'
import { db } from '@/lib/db'

const mockSignupDraft = (db as any).signupDraft

describe('createDraft', () => {
  beforeEach(() => vi.clearAllMocks())

  it('cria draft com expiresAt = agora + 7 dias', async () => {
    const before = Date.now()
    const fakeId = 'draft-123'
    mockSignupDraft.create.mockResolvedValue({
      id: fakeId,
      expiresAt: new Date(before + 7 * 24 * 60 * 60 * 1000),
    })

    const draft = await createDraft()

    expect(mockSignupDraft.create).toHaveBeenCalledOnce()
    const callArgs = mockSignupDraft.create.mock.calls[0][0]
    const expiresAt: Date = callArgs.data.expiresAt
    const diff = expiresAt.getTime() - before
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    // expiresAt deve estar entre 7 dias e 7 dias + 5 segundos (tolerância)
    expect(diff).toBeGreaterThanOrEqual(sevenDaysMs)
    expect(diff).toBeLessThan(sevenDaysMs + 5000)
    expect(draft.id).toBe(fakeId)
  })
})

describe('updateDraft', () => {
  beforeEach(() => vi.clearAllMocks())

  it('atualiza apenas os campos passados', async () => {
    const fakeId = 'draft-456'
    mockSignupDraft.update.mockResolvedValue({ id: fakeId, nomeClinica: 'Clínica Boa' })

    await updateDraft(fakeId, { nomeClinica: 'Clínica Boa' })

    expect(mockSignupDraft.update).toHaveBeenCalledWith({
      where: { id: fakeId },
      data: { nomeClinica: 'Clínica Boa' },
    })
  })
})

describe('cleanupExpiredDrafts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deleta apenas drafts expirados e retorna contagem', async () => {
    mockSignupDraft.deleteMany.mockResolvedValue({ count: 3 })

    const count = await cleanupExpiredDrafts()

    expect(count).toBe(3)
    expect(mockSignupDraft.deleteMany).toHaveBeenCalledOnce()
    const callArgs = mockSignupDraft.deleteMany.mock.calls[0][0]
    // Verifica que filtra por expiresAt < agora
    expect(callArgs.where.expiresAt).toHaveProperty('lt')
    const lt: Date = callArgs.where.expiresAt.lt
    expect(lt).toBeInstanceOf(Date)
    expect(lt.getTime()).toBeLessThanOrEqual(Date.now() + 100)
  })
})
