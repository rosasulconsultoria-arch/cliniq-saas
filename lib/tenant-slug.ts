// Reads env vars per-call so tests can stub them via vi.stubEnv.
export function extractTenantSlug(host: string | null): string | null {
  if (!host) return null
  const baseDomain = process.env.BASE_DOMAIN ?? 'cliniq.com.br'

  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return process.env.DEV_TENANT_SLUG ?? 'neuroconexao'
  }

  if (host.endsWith(`.${baseDomain}`)) {
    const subdomain = host.slice(0, -(baseDomain.length + 1))
    if (subdomain && subdomain !== 'www') return subdomain
  }

  return null
}
