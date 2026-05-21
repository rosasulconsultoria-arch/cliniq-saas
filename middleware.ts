import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextRequest, NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

// Domínio base da aplicação (sem subdomínio)
const BASE_DOMAIN = process.env.BASE_DOMAIN ?? 'cliniq.com.br'

/**
 * Extrai o slug do tenant a partir do host da request.
 *
 * - Produção: neuroconexao.cliniq.com.br → 'neuroconexao'
 * - Dev/localhost: usa DEV_TENANT_SLUG do .env.local
 * - Root domain ou www: retorna null → middleware redireciona para landing
 */
function extractTenantSlug(req: NextRequest): string | null {
  const host = req.headers.get('host') ?? ''

  // Desenvolvimento local — qualquer variação de localhost
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return process.env.DEV_TENANT_SLUG ?? 'neuroconexao'
  }

  // Subdomínio em produção: neuroconexao.cliniq.com.br
  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const subdomain = host.slice(0, -(BASE_DOMAIN.length + 1))
    if (subdomain && subdomain !== 'www') return subdomain
  }

  return null
}

/**
 * Retorna NextResponse.next() com x-tenant-slug injetado nos headers da request.
 * Server Components lêem esse header via headers() do Next.js.
 */
function nextWithTenantSlug(req: NextRequest, slug: string): NextResponse {
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-tenant-slug', slug)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role as string | undefined

  // ── Resolução de tenant ──────────────────────────────────────────────────
  const slug = extractTenantSlug(req)

  // Root domain (cliniq.com.br) ou www → redireciona para landing
  // TODO: substituir pela URL definitiva da landing page quando disponível
  if (!slug) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // ── Lógica de autenticação (inalterada) ──────────────────────────────────
  const isPublica =
    pathname.startsWith('/agendar') ||
    pathname.startsWith('/redefinir-senha') ||
    pathname === '/login' ||
    pathname === '/esqueci-senha'

  if (isPublica) {
    if (isLoggedIn && (pathname === '/login' || pathname === '/esqueci-senha')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return nextWithTenantSlug(req, slug)
  }

  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const rotasAdmin = ['/financeiro', '/relatorios']
  if (rotasAdmin.some((r) => pathname.startsWith(r)) && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return nextWithTenantSlug(req, slug)
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
