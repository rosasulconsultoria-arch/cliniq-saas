import { z } from 'zod'

const toOptionalNumber = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return null
  if (typeof v === 'number') return isNaN(v) ? null : v
  const n = Number(v)
  return isNaN(n) ? null : n
}

export const ProfissionalSchema = z
  .object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
    especialidade: z.string().min(2, 'Especialidade obrigatória'),
    crp: z.string().optional(),
    tipoVinculo: z.enum(['COMISSIONADO', 'LOCATARIO']),
    comissaoPercentual: z.preprocess(toOptionalNumber, z.number().min(0).max(100).nullable().optional()),
    valorAluguelMensal: z.preprocess(toOptionalNumber, z.number().min(0).nullable().optional()),
    valorConsultaPadrao: z.preprocess(toOptionalNumber, z.number().min(0).nullable().optional()),
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
