'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function RoleFilter() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('role') ?? ''

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (value && value !== 'todos') params.set('role', value)
    else params.delete('role')
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={current || 'todos'} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Todos os perfis" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todos">Todos os perfis</SelectItem>
        <SelectItem value="ADMIN">Admin</SelectItem>
        <SelectItem value="PROFISSIONAL">Profissional</SelectItem>
        <SelectItem value="RECEPCAO">Recepção</SelectItem>
      </SelectContent>
    </Select>
  )
}
