'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function SearchInput({ placeholder = 'Buscar...' }: { placeholder?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') ?? '')

  const updateSearch = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', '1')
      if (val) params.set('q', val)
      else params.delete('q')
      router.replace(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams]
  )

  useEffect(() => {
    const timer = setTimeout(() => updateSearch(value), 350)
    return () => clearTimeout(timer)
  }, [value, updateSearch])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 w-72"
      />
    </div>
  )
}
