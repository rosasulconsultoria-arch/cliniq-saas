import { z } from 'zod'

export const ProfissionalSchema = z
  .object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
    especialidade: z.string().min(2, 'Especialidade obrigatória'),
    crp: z.string().optional(),
    tipoVinculo: z.enum(['COMISSIONADO', 'LOCATARIO']),
    comissaoPercentual: z.coerce.number().min(0).max(100).optional().nullable(),
    valorAluguelMensal: z.coerce.number().min(0).optional().nullable(),
    valorConsultaPadrao: z.coerce.number().min(0).optional().nullable(),
    bio: z.string().optional(),
    ativo: z.boolean().default(true),
  })
  .refine(
    (d) => d.tipoVinculo !== 'COMISSIONADO' || (d.comissaoPercentual != null),
    { message: 'Informe o percentual de comissão', path: ['comissaoPercentual'] }
  )
  .refine(
    (d) => d.tipoVinculo !== 'LOCATARIO' || (d.valorAluguelMensal != null),
    { message: 'Informe o valor do aluguel mensal', path: ['valorAluguelMensal'] }
  )

export type ProfissionalFormData = z.infer<typeof ProfissionalSchema>
