import { z } from 'zod'

export const SalaSchema = z.object({
  nome: z.string().min(2, 'Nome da sala obrigatório'),
  capacidade: z.coerce.number().int().min(1, 'Capacidade mínima é 1'),
  descricao: z.string().optional(),
  ativa: z.boolean().default(true),
})

export type SalaFormData = z.infer<typeof SalaSchema>
