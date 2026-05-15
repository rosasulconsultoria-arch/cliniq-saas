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
        try {
          const parsed = credenciaisSchema.safeParse(credentials)
          if (!parsed.success) {
            console.error('[auth] schema inválido:', parsed.error.issues)
            return null
          }

          const usuario = await db.user.findUnique({
            where: { email: parsed.data.email },
          })

          if (!usuario) {
            console.error('[auth] usuário não encontrado:', parsed.data.email)
            return null
          }

          if (!usuario.active) {
            console.error('[auth] usuário inativo:', parsed.data.email)
            return null
          }

          const senhaValida = await bcrypt.compare(parsed.data.password, usuario.passwordHash)
          if (!senhaValida) {
            console.error('[auth] senha inválida para:', parsed.data.email)
            return null
          }

          console.log('[auth] login OK:', parsed.data.email)
          return {
            id: usuario.id,
            name: usuario.name,
            email: usuario.email,
            role: usuario.role,
          }
        } catch (e) {
          console.error('[auth] erro no authorize:', e)
          return null
        }
      },
    }),
  ],
})
