/**
 * Testes para lib/tenant-header.ts — getCurrentTenant()
 *
 * Resolve tenant via x-tenant-slug header para Server Components do dashboard
 * onde o ALS (AsyncLocalStorage) não propaga no pipeline React 19 RSC.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockHeaderGet, mockRedirect, mockGetTenantBySlug } = vi.hoisted(() => ({
  mockHeaderGet: vi.fn(),
  mockRedirect: vi.fn(),
  mockGetTenantBySlug: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({ get: mockHeaderGet }),
}))

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

vi.mock('@/lib/tenant-lookup', () => ({
  getTenantBySlug: mockGetTenantBySlug,
}))

import { getCurrentTenant } from '@/lib/tenant-header'

const TENANT_FAKE = { id: 'tenant-abc-123', nome: 'Clínica Teste', status: 'ATIVO' }

describe('getCurrentTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Simula comportamento real do Next.js: redirect() interrompe execução lançando exceção
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT')
    })
  })

  it('retorna tenant quando slug presente e tenant existe no banco', async () => {
    mockHeaderGet.mockReturnValue('minha-clinica')
    mockGetTenantBySlug.mockResolvedValue(TENANT_FAKE)

    const result = await getCurrentTenant()

    expect(result).toEqual(TENANT_FAKE)
    expect(mockGetTenantBySlug).toHaveBeenCalledWith('minha-clinica')
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redireciona para /login quando x-tenant-slug ausente no header (null)', async () => {
    mockHeaderGet.mockReturnValue(null)

    await expect(getCurrentTenant()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
    expect(mockGetTenantBySlug).not.toHaveBeenCalled()
  })

  it('redireciona para /login quando x-tenant-slug vazio no header', async () => {
    mockHeaderGet.mockReturnValue('')

    await expect(getCurrentTenant()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
    expect(mockGetTenantBySlug).not.toHaveBeenCalled()
  })

  it('redireciona para /login quando tenant não encontrado no banco (slug inválido)', async () => {
    mockHeaderGet.mockReturnValue('slug-inexistente')
    mockGetTenantBySlug.mockResolvedValue(null)

    await expect(getCurrentTenant()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('passa o slug exato do header para getTenantBySlug sem modificação', async () => {
    mockHeaderGet.mockReturnValue('neuro-conexao-2026')
    mockGetTenantBySlug.mockResolvedValue(TENANT_FAKE)

    await getCurrentTenant()

    expect(mockGetTenantBySlug).toHaveBeenCalledTimes(1)
    expect(mockGetTenantBySlug).toHaveBeenCalledWith('neuro-conexao-2026')
  })
})
