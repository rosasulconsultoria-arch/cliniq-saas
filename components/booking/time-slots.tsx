'use client'

import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface Props {
  slots: string[]
  selected: string | null
  onSelect: (time: string) => void
  isLoading?: boolean
}

export function TimeSlots({ slots, selected, onSelect, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhum horário disponível neste dia.<br />
          Selecione outra data.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {slots.map((slot) => (
        <button
          key={slot}
          onClick={() => onSelect(slot)}
          className={cn(
            'h-12 rounded-xl text-sm font-semibold border-2 transition-all',
            selected === slot
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105'
              : 'bg-white dark:bg-slate-900 border-border text-foreground hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
          )}
        >
          {slot}
        </button>
      ))}
    </div>
  )
}
