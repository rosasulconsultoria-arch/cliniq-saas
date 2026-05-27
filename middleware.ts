import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantBilling } from '@/lib/tenant-lookup'
import { classificarAcessoTenant } from '@/lib/billing/status'
import { isRotaPublica } from '@/lib/public-routes'
import { extractTenantSlug } from '@/lib/tenant-slug'

const { auth } = NextAuth(authConfig)

/**
 * Retorna NextResponse.next() com x-tenant-slug injetado nos headers da request.
 * Server Components lêem esse header via headers() do Next.js.
 */
function nextWithTenantSlug(req: NextRequest, slug: string): NextResponse {
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-tenant-slug', slug)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export default auth(async (req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const role = req.auth?.user?.role as string | undefined

  // ── Resolução de tenant ──────────────────────────────────────────────────
  const slug = extractTenantSlug(req.headers.get('host'))

  if (process.env.NODE_ENV !== 'production' && slug) {
    console.log(`[middleware] tenant resolvido via host: ${slug}`)
  }

  // Root domain (cliniq.com.br) ou www → redireciona para landing
  // TODO: substituir pela URL definitiva da landing page quando disponível
  if (!slug) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // ── Lógica de autenticação ───────────────────────────────────────────────
  if (isRotaPublica(pathname)) {
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

  // ── Verificação de billing ────────────────────────────────────────────────
  // /api/* retornam 402 via helper no próprio route handler (não aqui)
  // /billing/* sempre acessível (usuário BLOCKED precisa chegar até lá)
  // rotas públicas já retornaram acima via isRotaPublica()
  const ignorarBilling =
    pathname.startsWith('/billing') || pathname.startsWith('/api')

  if (!ignorarBilling) {
    const tenantBilling = await getTenantBilling(slug)
    if (tenantBilling) {
      const acesso = classificarAcessoTenant(tenantBilling)

      if (acesso.level === 'BLOCKED') {
        return NextResponse.redirect(new URL('/billing/upgrade', req.url))
      }

      if (acesso.level === 'WARNING') {
        const res = nextWithTenantSlug(req, slug)
        const aviso = acesso.diasRestantes !== undefined
          ? String(acesso.diasRestantes)
          : 'payment'
        res.headers.set('X-Tenant-Warning', aviso)
        return res
      }
    }
  }

  return nextWithTenantSlug(req, slug)
})

// nodejs runtime estável no Next.js 15.5 — sem flag experimental.
// Necessário para Prisma/crypto no middleware (edge não suporta).
export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
