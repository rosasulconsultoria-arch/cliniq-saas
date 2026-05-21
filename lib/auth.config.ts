import type { NextAuthConfig } from 'next-auth'

// Configuração edge-compatible (sem Node.js modules)
// Usada pelo middleware e estendida pelo auth.ts
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as any).role
        token.mustChangePassword = (user as any).mustChangePassword ?? false
        token.tenantId = (user as any).tenantId
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.mustChangePassword = token.mustChangePassword ?? false
        session.user.tenantId = token.tenantId as string
      }
      return session
    },
  },
  providers: [],
}
