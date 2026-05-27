/**
 * Testa o comportamento de fallback do authorize em lib/auth.ts.
 *
 * authorize tenta x-tenant-slug primeiro; se ausente, chama extractTenantSlug(host).
 * Estes testes verificam os cenários exatos que o fallback exercita — sem precisar
 * importar lib/auth.ts (o que triggeria NextAuth initialization no processo de teste).
 *
 * Regressão alvo: /api/auth/callback/credentials exclui middleware matcher,
 * então x-tenant-slug nunca é injetado para chamadas de login. O fallback via host
 * resolve o tenant sem depender do middleware.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { extractTenantSlug } from '@/lib/tenant-slug'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('authorize fallback — caminho que auth.ts executa quando x-tenant-slug ausente', () => {
  it('host localhost:3002 resolve para DEV_TENANT_SLUG (cenário exato do bug)', () => {
    vi.stubEnv('DEV_TENANT_SLUG', 'neuroconexao')
    // Simula: slug = extractTenantSlug(request.headers.get('host'))
    const slug = extractTenantSlug('localhost:3002')
    expect(slug).toBe('neuroconexao')
  })

  it('host localhost sem porta resolve para DEV_TENANT_SLUG', () => {
    vi.stubEnv('DEV_TENANT_SLUG', 'neuroconexao')
    expect(extractTenantSlug('localhost')).toBe('neuroconexao')
  })

  it('host de produção (subdomínio) resolve corretamente quando x-tenant-slug ausente', () => {
    vi.stubEnv('BASE_DOMAIN', 'cliniq.com.br')
    expect(extractTenantSlug('neuroconexao.cliniq.com.br')).toBe('neuroconexao')
  })

  it('host ausente (null) retorna null — authorize loga erro e retorna null', () => {
    // Simula: request.headers.get('host') === null
    expect(extractTenantSlug(null)).toBeNull()
  })

  it('host inválido (domínio desconhecido) retorna null — authorize falha graciosamente', () => {
    vi.stubEnv('BASE_DOMAIN', 'cliniq.com.br')
    expect(extractTenantSlug('unknown.other.com')).toBeNull()
  })
})
