import { z } from 'zod'

export const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Outro'] as const

const toNum = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return null
  if (typeof v === 'number') return isNaN(v) ? null : v
  const n = Number(v); return isNaN(n) ? null : n
}

export const ParcelamentoSchema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória'),
  agendamentoId: z.string().optional().nullable(),
  valorTotal: z.preprocess(toNum, z.number().min(0.01, 'Valor obrigatório')),
  bandeira: z.string().min(1, 'Bandeira obrigatória'),
  tipoPagamento: z.enum(['CREDITO', 'DEBITO']),
  taxaCartao: z.preprocess(toNum, z.number().min(0).max(20).nullable().optional()),
  totalParcelas: z.preprocess(toNum, z.number().int().min(1).max(48)),
  dataInicio: z.string().min(1, 'Data da primeira parcela obrigatória'),
})

export type ParcelamentoFormData = z.infer<typeof ParcelamentoSchema>
