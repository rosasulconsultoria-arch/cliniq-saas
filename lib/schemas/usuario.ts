import { z } from 'zod'

export const UsuarioSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'PROFISSIONAL', 'RECEPCAO']),
  active: z.boolean().default(true),
})

export type UsuarioFormData = z.infer<typeof UsuarioSchema>
