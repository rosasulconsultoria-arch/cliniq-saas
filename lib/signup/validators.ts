import { z } from 'zod'
import { ESPECIALIDADES } from '../specialities'
import { PlanoTenant, Periodicidade } from '@prisma/client'

export const planoSchema = z.object({
  planoId: z.nativeEnum(PlanoTenant),
  periodicidade: z.nativeEnum(Periodicidade),
})

export const clinicaSchema = z.object({
  nomeClinica: z.string().min(3, 'Nome da clínica deve ter pelo menos 3 caracteres'),
  slug: z
    .string()
    .min(3, 'Endereço deve ter pelo menos 3 caracteres')
    .max(50, 'Endereço deve ter no máximo 50 caracteres')
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
      'Endereço deve conter apenas letras minúsculas, números e hífens, sem hífen no início ou fim'
    ),
  especialidade: z.enum(ESPECIALIDADES, {
    errorMap: () => ({ message: 'Especialidade inválida' }),
  }),
  telefone: z
    .string()
    .regex(
      /^(\+?55\s?)?(\(?\d{2}\)?\s?)(\d{4,5}[-\s]?\d{4})$/,
      'Telefone inválido. Use o formato: (11) 99999-9999'
    ),
})

export const adminSchema = z
  .object({
    nomeAdmin: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    emailAdmin: z.string().email('Email inválido'),
    senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    confirmacaoSenha: z.string(),
    termosAceitos: z.literal(true, {
      errorMap: () => ({ message: 'Você deve aceitar os termos de uso' }),
    }),
  })
  .refine((data) => data.senha === data.confirmacaoSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmacaoSenha'],
  })

export const cartaoSchema = z.object({}).passthrough()

export type PlanoData = z.infer<typeof planoSchema>
export type ClinicaData = z.infer<typeof clinicaSchema>
export type AdminData = z.infer<typeof adminSchema>
