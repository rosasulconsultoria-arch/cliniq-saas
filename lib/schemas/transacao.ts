import { z } from 'zod'

export const TransacaoSchema = z.object({
  tipo: z.enum(['RECEITA', 'DESPESA', 'INVESTIMENTO']),
  categoriaId: z.string().min(1, 'Categoria obrigatória'),
  descricao: z.string().min(2, 'Descrição obrigatória'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  data: z.string().min(1, 'Data obrigatória'),
  formaPagamento: z.string().optional(),
  status: z.enum(['PENDENTE', 'PAGO']).default('PENDENTE'),
  dataPagamento: z.string().optional().nullable(),
  profissionalId: z.string().optional().nullable(),
  observacoes: z.string().optional(),
})

export type TransacaoFormData = z.infer<typeof TransacaoSchema>
