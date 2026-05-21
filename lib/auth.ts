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
      async authorize(credentials, request) {
        try {
          const parsed = credenciaisSchema.safeParse(credentials)
          if (!parsed.success) {
            console.error('[auth] schema inválido:', parsed.error.issues)
            return null
          }

          // Resolve tenant pelo subdomínio — injetado pelo middleware via x-tenant-slug.
          // Isso garante que admin da Clínica A não pode autenticar com email da Clínica B.
          const slug = request.headers.get('x-tenant-slug')
          if (!slug) {
            console.error('[auth] x-tenant-slug ausente — middleware não configurado?')
            return null
          }

          const tenant = await db.tenant.findUnique({ where: { slug } })
          if (!tenant) {
            console.error('[auth] tenant não encontrado para slug:', slug)
            return null
          }

          // Busca por email + tenantId — email é único APENAS dentro do tenant
          const usuario = await db.user.findFirst({
            where: { email: parsed.data.email, tenantId: tenant.id },
          })

          if (!usuario) {
            console.error('[auth] usuário não encontrado:', parsed.data.email, 'tenant:', slug)
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

          console.log('[auth] login OK:', parsed.data.email, 'tenant:', slug)
          return {
            id: usuario.id,
            name: usuario.name,
            email: usuario.email,
            role: usuario.role,
            mustChangePassword: usuario.mustChangePassword,
            tenantId: usuario.tenantId,
          }
        } catch (e) {
          console.error('[auth] erro no authorize:', e)
          return null
        }
      },
    }),
  ],
})
