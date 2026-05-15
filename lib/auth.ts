import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const credenciaisSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credenciaisSchema.safeParse(credentials)
        if (!parsed.success) return null

        const usuario = await db.user.findUnique({
          where: { email: parsed.data.email },
        })

        if (!usuario || !usuario.active) return null

        const senhaValida = await bcrypt.compare(parsed.data.password, usuario.passwordHash)
        if (!senhaValida) return null

        return {
          id: usuario.id,
          name: usuario.name,
          email: usuario.email,
          role: usuario.role,
        }
      },
    }),
  ],
})
