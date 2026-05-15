import { z } from 'zod'

export const CategoriaSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  tipo: z.enum(['RECEITA', 'DESPESA', 'INVESTIMENTO']),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida').default('#6366f1'),
})

export type CategoriaFormData = z.infer<typeof CategoriaSchema>
