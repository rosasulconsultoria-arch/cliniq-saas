import { z } from 'zod'

export const AgendamentoSchema = z.object({
  profissionalId: z.string().min(1, 'Profissional obrigatório'),
  pacienteId: z.string().min(1, 'Paciente obrigatório'),
  salaId: z.string().min(1, 'Sala obrigatória'),
  dataHoraInicio: z.string().min(1, 'Data e horário obrigatórios'),
  duracao: z.coerce.number().int().min(30, 'Mínimo 30 minutos').default(50),
  valor: z.coerce.number().min(0, 'Valor deve ser positivo'),
  tipoCobranca: z.enum(['CONSULTA', 'PACOTE']).default('CONSULTA'),
  totalSessoes: z.coerce.number().int().min(2).optional().nullable(),
  formaPagamento: z.string().optional().nullable(),
  bandeiraCartao: z.string().optional().nullable(),
  numeroParcelas: z.coerce.number().int().min(1).max(48).optional().nullable(),
  taxaCartaoPerc: z.coerce.number().min(0).max(20).optional().nullable(),
  origem: z.enum(['PUBLICO', 'INTERNO']).default('INTERNO'),
  observacoes: z.string().optional(),
  recorrente: z.boolean().default(false),
  totalRecorrencias: z.coerce.number().int().min(2).max(52).optional().nullable(),
  servicoIds: z.array(z.string()).optional().default([]),
})

export type AgendamentoFormData = z.infer<typeof AgendamentoSchema>
