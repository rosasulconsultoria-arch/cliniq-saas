import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'

export function periodoToRange(preset: string, de?: string, ate?: string): { inicio: string; fim: string } {
  const h = new Date()
  switch (preset) {
    case 'mes_anterior': {
      const m = subMonths(h, 1)
      return { inicio: format(startOfMonth(m), 'yyyy-MM-dd'), fim: format(endOfMonth(m), 'yyyy-MM-dd') }
    }
    case 'ultimos_3_meses':
      return { inicio: format(startOfMonth(subMonths(h, 2)), 'yyyy-MM-dd'), fim: format(endOfMonth(h), 'yyyy-MM-dd') }
    case 'ano':
      return { inicio: format(startOfYear(h), 'yyyy-MM-dd'), fim: format(endOfYear(h), 'yyyy-MM-dd') }
    case 'customizado':
      return { inicio: de ?? format(startOfMonth(h), 'yyyy-MM-dd'), fim: ate ?? format(endOfMonth(h), 'yyyy-MM-dd') }
    default:
      return { inicio: format(startOfMonth(h), 'yyyy-MM-dd'), fim: format(endOfMonth(h), 'yyyy-MM-dd') }
  }
}
