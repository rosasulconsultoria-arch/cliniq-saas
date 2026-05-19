'use client'

import { useRouter, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'mes', label: 'Mês atual' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
]

export function PeriodoFilterFinanceiro({ value }: { value: string }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
      {OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => router.push(`${pathname}?periodo=${opt.value}`)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md transition-colors font-medium',
            value === opt.value
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
