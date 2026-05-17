import { z } from 'zod'

export const CATEGORIAS_DESPESA = [
  'Materiais',
  'Equipamentos',
  'Capacitação Profissional',
  'Software / Tecnologia',
  'Marketing',
  'Outros',
] as const

const toNumber = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return null
  if (typeof v === 'number') return isNaN(v) ? null : v
  const n = Number(v)
  return isNaN(n) ? null : n
}

export const DespesaProfissionalSchema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória'),
  valor: z.preprocess(toNumber, z.number().min(0.01, 'Valor deve ser maior que zero')),
  data: z.string().min(1, 'Data obrigatória'),
  categoria: z.string().min(1, 'Categoria obrigatória'),
  status: z.enum(['PENDENTE', 'PAGO']).default('PENDENTE'),
  observacao: z.string().optional(),
})

export type DespesaProfissionalData = z.infer<typeof DespesaProfissionalSchema>
