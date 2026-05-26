import { z } from 'zod'

export const cartaoCreditoSchema = z.object({
  holderName: z.string().min(2, 'Nome obrigatório'),
  number: z
    .string()
    .transform((v) => v.replace(/\s/g, ''))
    .refine((v) => v.length === 16, 'Número do cartão deve ter 16 dígitos'),
  expiryMonth: z.string().length(2, 'Mês inválido'),
  expiryYear: z.string().length(4, 'Ano inválido'),
  ccv: z.string().min(3).max(4, 'CVV inválido'),
})

export const titularCartaoSchema = z.object({
  cpfCnpj: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 11 || v.length === 14, 'CPF/CNPJ inválido'),
  postalCode: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length === 8, 'CEP inválido'),
  addressNumber: z.string().min(1, 'Número obrigatório'),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v.length >= 10, 'Telefone inválido'),
})

export const atualizarCartaoSchema = cartaoCreditoSchema.merge(titularCartaoSchema)

export type AtualizarCartaoInput = z.infer<typeof atualizarCartaoSchema>
