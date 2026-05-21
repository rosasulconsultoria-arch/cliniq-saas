import { type DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      mustChangePassword: boolean
      tenantId: string
    } & DefaultSession['user']
  }

  interface User {
    role: string
    mustChangePassword: boolean
    tenantId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    mustChangePassword: boolean
    tenantId: string
  }
}
