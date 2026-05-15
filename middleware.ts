import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'

// Instancia NextAuth só com a config edge-compatible (sem bcrypt/pg/crypto)
const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl
  const role = req.auth?.user?.role as string | undefined

  const isPublica =
    pathname.startsWith('/agendar') ||
    pathname === '/login' ||
    pathname === '/esqueci-senha'

  if (isPublica) {
    if (isLoggedIn && (pathname === '/login' || pathname === '/esqueci-senha')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
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
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
