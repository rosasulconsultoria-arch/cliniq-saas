'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function MesFilter() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('mes') ?? format(new Date(), 'yyyy-MM')

  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return {
      value: format(d, 'yyyy-MM'),
      label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
    }
  })

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('mes', value)
    params.set('page', '1')
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={current} onValueChange={onChange}>
      <SelectTrigger className="w-44 capitalize"><SelectValue /></SelectTrigger>
      <SelectContent>
        {meses.map((m) => (
          <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
