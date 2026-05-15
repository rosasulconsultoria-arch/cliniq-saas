'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PRESETS = [
  { value: 'mes_atual', label: 'Este mês' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'ultimos_3_meses', label: 'Últimos 3 meses' },
  { value: 'ano', label: 'Este ano' },
  { value: 'customizado', label: 'Personalizado' },
]

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

export function PeriodoRelatorio() {
  const pathname = usePathname()
  const router = useRouter()
  const sp = useSearchParams()
  const preset = sp.get('periodo') ?? 'mes_atual'
  const [de, setDe] = useState(sp.get('de') ?? '')
  const [ate, setAte] = useState(sp.get('ate') ?? '')

  function set(p: string) {
    const params = new URLSearchParams(sp.toString())
    params.set('periodo', p)
    params.delete('de'); params.delete('ate')
    router.replace(`${pathname}?${params.toString()}`)
  }

  function apply() {
    if (!de || !ate) return
    const params = new URLSearchParams(sp.toString())
    params.set('periodo', 'customizado')
    params.set('de', de); params.set('ate', ate)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={set}>
        <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
        <SelectContent>{PRESETS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
      {preset === 'customizado' && (
        <>
          <Input type="date" value={de} onChange={e => setDe(e.target.value)} className="h-9 w-36" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" value={ate} onChange={e => setAte(e.target.value)} className="h-9 w-36" />
          <Button size="sm" className="h-9" onClick={apply}>Aplicar</Button>
        </>
      )}
    </div>
  )
}
