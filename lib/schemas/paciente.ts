import { z } from 'zod'
import { validarCPF } from '@/lib/utils'

export const PacienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z
    .string()
    .refine((v) => v.replace(/\D/g, '').length === 11, 'CPF deve ter 11 dígitos')
    .refine((v) => validarCPF(v.replace(/\D/g, '')), 'CPF inválido'),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  dataNascimento: z.string().optional(),
  genero: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
})

export type PacienteFormData = z.infer<typeof PacienteSchema>
