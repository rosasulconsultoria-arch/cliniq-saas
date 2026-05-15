'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const OPCOES = [
  { value: 'mes_atual', label: 'Este mês' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'ultimos_3_meses', label: 'Últimos 3 meses' },
  { value: 'ano', label: 'Este ano' },
  { value: 'customizado', label: 'Personalizado' },
]

export function PeriodFilter() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('periodo') ?? 'mes_atual'
  const [de, setDe] = useState(searchParams.get('de') ?? '')
  const [ate, setAte] = useState(searchParams.get('ate') ?? '')

  function onPeriodoChange(v: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', v)
    params.delete('de')
    params.delete('ate')
    router.replace(`${pathname}?${params.toString()}`)
  }

  function applyCustom() {
    if (!de || !ate) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', 'customizado')
    params.set('de', de)
    params.set('ate', ate)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={current} onValueChange={onPeriodoChange}>
        <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {OPCOES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {current === 'customizado' && (
        <>
          <Input type="date" value={de} onChange={e => setDe(e.target.value)} className="h-9 w-36" />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" value={ate} onChange={e => setAte(e.target.value)} className="h-9 w-36" />
          <Button size="sm" className="h-9" onClick={applyCustom}>Aplicar</Button>
        </>
      )}
    </div>
  )
}
