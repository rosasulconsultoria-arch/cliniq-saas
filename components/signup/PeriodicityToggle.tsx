'use client'

import { Badge } from '@/components/ui/badge'

export type Periodicidade = 'MENSAL' | 'ANUAL'

interface PeriodicityToggleProps {
  value: Periodicidade
  onChange: (value: Periodicidade) => void
}

export function PeriodicityToggle({ value, onChange }: PeriodicityToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex rounded-lg border bg-muted p-1">
        <button
          type="button"
          onClick={() => onChange('MENSAL')}
          className={`rounded-md px-5 py-2 text-sm font-medium transition-all ${
            value === 'MENSAL'
              ? 'bg-white text-foreground shadow-sm dark:bg-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => onChange('ANUAL')}
          className={`rounded-md px-5 py-2 text-sm font-medium transition-all ${
            value === 'ANUAL'
              ? 'bg-white text-foreground shadow-sm dark:bg-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Anual
        </button>
      </div>
      <Badge
        variant="secondary"
        className="border-green-200 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      >
        Economize 20%
      </Badge>
    </div>
  )
}
