import { z } from 'zod'

export const AgendamentoSchema = z.object({
  profissionalId: z.string().min(1, 'Profissional obrigatório'),
  pacienteId: z.string().min(1, 'Paciente obrigatório'),
  salaId: z.string().min(1, 'Sala obrigatória'),
  dataHoraInicio: z.string().min(1, 'Data e horário obrigatórios'),
  duracao: z.coerce.number().int().min(30, 'Mínimo 30 minutos').default(50),
  valor: z.coerce.number().min(0, 'Valor deve ser positivo'),
  origem: z.enum(['PUBLICO', 'INTERNO']).default('INTERNO'),
  observacoes: z.string().optional(),
})

export type AgendamentoFormData = z.infer<typeof AgendamentoSchema>
