import { z } from 'zod'
import { validarCPF } from '@/lib/utils'

export const PacienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.preprocess(
    (v) => {
      if (typeof v !== 'string') return undefined
      const digits = v.replace(/\D/g, '')
      return digits.length === 0 ? undefined : v
    },
    z
      .string()
      .refine((v) => v.replace(/\D/g, '').length === 11, 'CPF deve ter 11 dígitos')
      .refine((v) => validarCPF(v.replace(/\D/g, '')), 'CPF inválido')
      .optional(),
  ),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  dataNascimento: z.string().optional(),
  genero: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
})

export type PacienteFormData = z.infer<typeof PacienteSchema>
