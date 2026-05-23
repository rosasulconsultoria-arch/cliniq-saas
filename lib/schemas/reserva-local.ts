import { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const DIAS_SEMANA_LABELS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
] as const

export const ReservaLocalSchema = z.object({
  profissionalId: z.string().min(1, 'Selecione um profissional'),
  diaSemana:      z.coerce.number().int().min(0).max(6),
  horaInicio:     z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM obrigatório'),
  horaFim:        z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM obrigatório'),
  vigenciaInicio: z.string().optional().nullable(),
  vigenciaFim:    z.string().optional().nullable(),
  ativa:          z.boolean().default(true),
}).refine(
  d => d.horaInicio < d.horaFim,
  { message: 'O horário de término deve ser posterior ao horário de início', path: ['horaFim'] }
).refine(
  d => !d.vigenciaInicio || !d.vigenciaFim || d.vigenciaInicio < d.vigenciaFim,
  { message: 'A data de início da vigência deve ser anterior à data de fim', path: ['vigenciaFim'] }
)

export type ReservaLocalFormData = z.infer<typeof ReservaLocalSchema>

export function formatVigencia(vigenciaInicio: Date | string | null, vigenciaFim: Date | string | null): string {
  const fmt = (d: Date | string) => format(new Date(d), 'dd/MM/yyyy', { locale: ptBR })
  if (!vigenciaInicio && !vigenciaFim) return 'Sem prazo definido'
  if (vigenciaInicio && vigenciaFim) return `Vigência: ${fmt(vigenciaInicio)} a ${fmt(vigenciaFim)}`
  if (vigenciaFim) return `Vigência: até ${fmt(vigenciaFim)}`
  return `Vigência: a partir de ${fmt(vigenciaInicio!)}`
}
