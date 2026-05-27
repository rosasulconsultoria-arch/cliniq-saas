import { describe, it, expect, afterEach, vi } from 'vitest'
import { extractTenantSlug } from '@/lib/tenant-slug'

describe('extractTenantSlug', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('null retorna null', () => {
    expect(extractTenantSlug(null)).toBeNull()
  })

  it('string vazia retorna null', () => {
    expect(extractTenantSlug('')).toBeNull()
  })

  it('localhost:3000 retorna DEV_TENANT_SLUG do env', () => {
    vi.stubEnv('DEV_TENANT_SLUG', 'minha-clinica')
    expect(extractTenantSlug('localhost:3000')).toBe('minha-clinica')
  })

  it('localhost sem DEV_TENANT_SLUG retorna "neuroconexao" como padrão', () => {
    const saved = process.env.DEV_TENANT_SLUG
    delete process.env.DEV_TENANT_SLUG
    expect(extractTenantSlug('localhost:3002')).toBe('neuroconexao')
    if (saved !== undefined) process.env.DEV_TENANT_SLUG = saved
  })

  it('127.0.0.1:3000 retorna DEV_TENANT_SLUG', () => {
    vi.stubEnv('DEV_TENANT_SLUG', 'test-tenant')
    expect(extractTenantSlug('127.0.0.1:3000')).toBe('test-tenant')
  })

  it('subdominio.cliniq.com.br retorna "subdominio"', () => {
    vi.stubEnv('BASE_DOMAIN', 'cliniq.com.br')
    expect(extractTenantSlug('neuroconexao.cliniq.com.br')).toBe('neuroconexao')
  })

  it('cliniq.com.br (root domain) retorna null', () => {
    vi.stubEnv('BASE_DOMAIN', 'cliniq.com.br')
    expect(extractTenantSlug('cliniq.com.br')).toBeNull()
  })

  it('www.cliniq.com.br retorna null', () => {
    vi.stubEnv('BASE_DOMAIN', 'cliniq.com.br')
    expect(extractTenantSlug('www.cliniq.com.br')).toBeNull()
  })

  it('domínio desconhecido retorna null', () => {
    vi.stubEnv('BASE_DOMAIN', 'cliniq.com.br')
    expect(extractTenantSlug('outra.empresa.com')).toBeNull()
  })
})
