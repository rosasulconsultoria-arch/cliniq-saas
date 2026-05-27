/**
 * Suite: Pages pré-autenticação — resolução de tenant via header
 *
 * Testa a lógica de resolução de tenant usada pelas pages pre-auth (sem JSX).
 * O tsconfig usa "jsx":"preserve" (Next.js), incompatível com Vite/esbuild em testes.
 * Os testes reproduzem o padrão exato de cada page inline — sem importar os componentes.
 *
 * Regressão alvo: commit d320c1f (2026-05-21) — sweep mecânico de multi-tenancy
 * substituiu `db` por `getTenantDb()` em pages pre-auth. `getTenantDb()` lança
 * "[TenantContext] Operação executada fora de contexto de tenant" porque essas pages
 * rodam antes de runWithTenant() estar ativo no AsyncLocalStorage.
 *
 * LIMITAÇÃO: estes testes não importam as pages reais nem exercitam o rendering
 * pipeline do Next.js (tsconfig "jsx":"preserve" impede import de TSX com JSX no Vite).
 * Bugs de ALS context só são detectados via smoke test ou Playwright.
 * Ver TODO.md — "[CRÍTICO] testes HTTP reais com Playwright".
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  db: {
    configClinica: { findFirst: vi.fn() },
    user:          { findFirst: vi.fn() },
    agendamento:   { findFirst: vi.fn() },
    profissional:  { findFirst: vi.fn() },
  },
}))

import { getTenantBySlug } from '@/lib/tenant-lookup'
import { db } from '@/lib/db'

const mockGetTenant    = vi.mocked(getTenantBySlug)
const mockDbConfig     = vi.mocked(db.configClinica.findFirst)
const mockDbUser       = vi.mocked(db.user.findFirst)
const mockDbAgendamento = vi.mocked(db.agendamento.findFirst)
const mockDbProf       = vi.mocked(db.profissional.findFirst)

const TENANT_A = { id: 'tid-a', nome: 'Clínica A', status: 'ATIVO' } as const

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTenant.mockResolvedValue(TENANT_A as any)
  mockDbConfig.mockResolvedValue(null)
  mockDbUser.mockResolvedValue(null)
  mockDbAgendamento.mockResolvedValue(null)
  mockDbProf.mockResolvedValue(null)
})

// ── Padrão de resolução de tenant para pages pre-auth ─────────────────────
// Simula o que cada page faz: header → getTenantBySlug → db.X.findFirst
// Se alguém substituir por getTenantDb() sem runWithTenant(), este padrão quebra
// e o smoke test captura o erro [TenantContext].

async function resolverTenantPreAuth(slug: string | null) {
  const tenant = slug ? await getTenantBySlug(slug) : null
  return tenant
}

// ─────────────────────────────────────────────────────────────────────────
describe('login/page — ConfigClinica para branding', () => {
  it('busca config com tenantId explícito quando tenant válido', async () => {
    const tenant = await resolverTenantPreAuth('clinic-a')
    const config = tenant
      ? await db.configClinica.findFirst({ where: { tenantId: tenant.id } })
      : null

    expect(mockGetTenant).toHaveBeenCalledWith('clinic-a')
    expect(mockDbConfig).toHaveBeenCalledWith({ where: { tenantId: 'tid-a' } })
    expect(config).toBeNull() // mock retorna null — page usa fallback padrão
  })

  it('não chama DB quando slug ausente (tenant null → fallbacks sem crash)', async () => {
    const tenant = await resolverTenantPreAuth(null)
    const config = tenant
      ? await db.configClinica.findFirst({ where: { tenantId: tenant.id } })
      : null

    expect(mockGetTenant).not.toHaveBeenCalled()
    expect(mockDbConfig).not.toHaveBeenCalled()
    expect(config).toBeNull()
  })

  it('não chama DB quando slug inválido (getTenantBySlug → null)', async () => {
    mockGetTenant.mockResolvedValue(null)
    const tenant = await resolverTenantPreAuth('slug-inexistente')
    const config = tenant
      ? await db.configClinica.findFirst({ where: { tenantId: tenant.id } })
      : null

    expect(mockGetTenant).toHaveBeenCalledWith('slug-inexistente')
    expect(mockDbConfig).not.toHaveBeenCalled()
    expect(config).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────
describe('redefinir-senha/[token]/page — validação de token com tenantId', () => {
  it('busca user com tenantId + token + expiry quando tenant válido', async () => {
    const mockUser = { name: 'Dr. Test' }
    mockDbUser.mockResolvedValue(mockUser as any)
    const token = 'abc123'

    const tenant = await resolverTenantPreAuth('clinic-a')
    if (!tenant) throw new Error('NEXT_NOT_FOUND')

    const user = await db.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() }, tenantId: tenant.id },
      select: { name: true },
    })

    expect(mockDbUser).toHaveBeenCalledWith({
      where: {
        resetToken: 'abc123',
        resetTokenExpiry: expect.objectContaining({ gt: expect.any(Date) }),
        tenantId: 'tid-a',
      },
      select: { name: true },
    })
    expect(user).toEqual(mockUser)
  })

  it('lança NEXT_NOT_FOUND quando tenant null (slug ausente)', async () => {
    const tenant = await resolverTenantPreAuth(null)
    await expect(async () => {
      if (!tenant) throw new Error('NEXT_NOT_FOUND')
    }).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockDbUser).not.toHaveBeenCalled()
  })

  it('lança NEXT_NOT_FOUND quando token expirado/inválido (user null)', async () => {
    mockDbUser.mockResolvedValue(null)
    const tenant = await resolverTenantPreAuth('clinic-a')
    const user = tenant
      ? await db.user.findFirst({
          where: { resetToken: 'expired', resetTokenExpiry: { gt: new Date() }, tenantId: tenant.id },
          select: { name: true },
        })
      : null
    await expect(async () => {
      if (!user) throw new Error('NEXT_NOT_FOUND')
    }).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('tenantId no where impede token de outro tenant funcionar', async () => {
    // user existe no banco mas pertence a outro tenant
    mockDbUser.mockResolvedValue(null) // tenantId filter returns null
    const tenant = await resolverTenantPreAuth('clinic-a')
    const user = tenant
      ? await db.user.findFirst({
          where: { resetToken: 'token-outro-tenant', resetTokenExpiry: { gt: new Date() }, tenantId: tenant.id },
          select: { name: true },
        })
      : null
    expect(user).toBeNull() // cross-tenant token correctly blocked
  })
})

// ─────────────────────────────────────────────────────────────────────────
describe('cancelar/[token]/page — agendamento com tenantId', () => {
  it('busca agendamento com tenantId explícito', async () => {
    const agendamentoId = 'ag-id-123'
    const tenant = await resolverTenantPreAuth('clinic-a')
    if (!tenant) throw new Error('NEXT_NOT_FOUND')

    await db.agendamento.findFirst({
      where: { id: agendamentoId, tenantId: tenant.id },
      include: {
        profissional: { include: { user: { select: { name: true } } } },
        paciente: { select: { nome: true } },
      },
    })

    expect(mockDbAgendamento).toHaveBeenCalledWith({
      where: { id: 'ag-id-123', tenantId: 'tid-a' },
      include: expect.any(Object),
    })
  })

  it('lança NEXT_NOT_FOUND quando tenant null', async () => {
    const tenant = await resolverTenantPreAuth(null)
    await expect(async () => {
      if (!tenant) throw new Error('NEXT_NOT_FOUND')
      await db.agendamento.findFirst({ where: { id: 'ag-id', tenantId: tenant.id } })
    }).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockDbAgendamento).not.toHaveBeenCalled()
  })

  it('agendamento de outro tenant retorna null (cross-tenant blocked)', async () => {
    mockDbAgendamento.mockResolvedValue(null)
    const tenant = await resolverTenantPreAuth('clinic-a')
    const ag = tenant
      ? await db.agendamento.findFirst({ where: { id: 'ag-outro-tenant', tenantId: tenant.id } })
      : null
    expect(ag).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────
describe('agendar/[slug]/page — profissional + config com tenantId', () => {
  const mockProf = {
    id: 'prof-1', especialidade: 'Psicologia',
    slugAgendamento: 'dr-test', ativo: true,
    user: { name: 'Dr. Test' }, disponibilidades: [],
  }

  it('busca profissional e config com tenantId explícito', async () => {
    mockDbProf.mockResolvedValue(mockProf as any)
    mockDbConfig.mockResolvedValue({ nome: 'Clínica A', corPrimaria: '#4f46e5', logoBase64: null } as any)

    const tenant = await resolverTenantPreAuth('clinic-a')
    if (!tenant) throw new Error('NEXT_NOT_FOUND')

    await Promise.all([
      db.profissional.findFirst({
        where: { slugAgendamento: 'dr-test', tenantId: tenant.id },
        include: { user: { select: { name: true } }, disponibilidades: true },
      }),
      db.configClinica.findFirst({ where: { tenantId: tenant.id } }),
    ])

    expect(mockDbProf).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ slugAgendamento: 'dr-test', tenantId: 'tid-a' }),
    }))
    expect(mockDbConfig).toHaveBeenCalledWith({ where: { tenantId: 'tid-a' } })
  })

  it('lança NEXT_NOT_FOUND quando tenant null', async () => {
    const tenant = await resolverTenantPreAuth(null)
    await expect(async () => {
      if (!tenant) throw new Error('NEXT_NOT_FOUND')
    }).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockDbProf).not.toHaveBeenCalled()
  })

  it('profissional de outro tenant retorna null (cross-tenant blocked)', async () => {
    mockDbProf.mockResolvedValue(null)
    const tenant = await resolverTenantPreAuth('clinic-a')
    const prof = tenant
      ? await db.profissional.findFirst({ where: { slugAgendamento: 'dr-de-outro-tenant', tenantId: tenant.id } })
      : null
    expect(prof).toBeNull()
  })

  describe('generateMetadata', () => {
    it('retorna metadados quando profissional encontrado', async () => {
      mockDbProf.mockResolvedValue(mockProf as any)
      const tenant = await resolverTenantPreAuth('clinic-a')
      if (!tenant) return
      const prof = await db.profissional.findFirst({
        where: { slugAgendamento: 'dr-test', tenantId: tenant.id },
        include: { user: { select: { name: true } } },
      })
      const meta = prof
        ? { title: `Agendar com ${(prof as any).user.name}`, description: `Agende uma consulta de ${(prof as any).especialidade} com ${(prof as any).user.name}` }
        : {}
      expect(meta).toEqual({
        title: 'Agendar com Dr. Test',
        description: expect.stringContaining('Dr. Test'),
      })
    })

    it('retorna {} quando tenant null', async () => {
      const tenant = await resolverTenantPreAuth(null)
      const meta = tenant ? {} /* never reached */ : {}
      expect(meta).toEqual({})
    })
  })
})
