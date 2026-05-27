import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { db } from '@/lib/db'

// Mocka setCurrentDraftId para evitar next/headers fora de contexto de request.
// O mock verifica que a função É chamada (cookie seria setado em produção).
// Se alguém remover o route handler e voltar para page.tsx, o cookie-set
// aconteceria num Server Component e lançaria — mas esses testes
// continuariam passando. O smoke test programático pega a regressão HTTP.
vi.mock('@/lib/signup/state', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/signup/state')>()
  return { ...mod, setCurrentDraftId: vi.fn().mockResolvedValue(undefined) }
})

const { verificarEmailToken } = await import('@/app/(public)/signup/actions')
const { setCurrentDraftId } = await import('@/lib/signup/state')

const SLUG = `e-verify-test-${Date.now()}`
let draftId: string

beforeEach(async () => {
  vi.clearAllMocks()
  const draft = await db.signupDraft.create({
    data: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  })
  draftId = draft.id
})

afterAll(async () => {
  await db.signupDraft.deleteMany({
    where: { id: { contains: SLUG } },
  }).catch(() => null)
})

describe('verificarEmailToken — cobertura do route handler', () => {
  it('token inválido → error: invalid, sem cookie, sem mudança no banco', async () => {
    const result = await verificarEmailToken('token-inexistente-abc')
    expect(result.success).toBe(false)
    expect(result.error).toBe('invalid')
    expect(setCurrentDraftId).not.toHaveBeenCalled()
  })

  it('token expirado → error: expired, sem cookie, emailVerificado permanece false', async () => {
    const token = `exp-${Date.now()}`
    await db.signupDraft.update({
      where: { id: draftId },
      data: {
        emailToken: token,
        emailTokenExp: new Date(Date.now() - 60 * 60 * 1000),
      },
    })

    const result = await verificarEmailToken(token)
    expect(result.success).toBe(false)
    expect(result.error).toBe('expired')
    expect(setCurrentDraftId).not.toHaveBeenCalled()

    const draft = await db.signupDraft.findUnique({ where: { id: draftId } })
    expect(draft?.emailVerificado).toBe(false)
  })

  it('token válido → success, emailVerificado=true, emailTokenUsed=true, cookie setado', async () => {
    const token = `valid-${Date.now()}`
    await db.signupDraft.update({
      where: { id: draftId },
      data: {
        emailToken: token,
        emailTokenExp: new Date(Date.now() + 60 * 60 * 1000),
        emailVerificado: false,
        emailTokenUsed: false,
      },
    })

    const result = await verificarEmailToken(token)
    expect(result.success).toBe(true)
    expect(result.draftId).toBe(draftId)
    expect(setCurrentDraftId).toHaveBeenCalledWith(draftId)

    const draft = await db.signupDraft.findUnique({ where: { id: draftId } })
    expect(draft?.emailVerificado).toBe(true)
    expect(draft?.emailTokenUsed).toBe(true)
  })

  it('token já usado → error: used, draftId retornado, cookie setado (continuidade do fluxo)', async () => {
    const token = `used-${Date.now()}`
    await db.signupDraft.update({
      where: { id: draftId },
      data: {
        emailToken: token,
        emailTokenExp: new Date(Date.now() + 60 * 60 * 1000),
        emailVerificado: true,
        emailTokenUsed: true,
      },
    })

    const result = await verificarEmailToken(token)
    expect(result.success).toBe(false)
    expect(result.error).toBe('used')
    expect(result.draftId).toBe(draftId)
    expect(setCurrentDraftId).toHaveBeenCalledWith(draftId)
  })
})
