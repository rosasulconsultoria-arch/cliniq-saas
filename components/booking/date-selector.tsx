'use client'

import { useMemo, useState } from 'react'
import {
  addMonths, subMonths, format, startOfMonth, endOfMonth,
  startOfWeek, addDays, isSameMonth, isSameDay, isToday, parseISO, isAfter, startOfDay
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  diasComDisponibilidade: number[] // 0=Dom, 6=Sáb
  onSelect: (date: string) => void
  selected: string | null
}

function buildGrid(month: Date): Date[][] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const weeks: Date[][] = []
  let cur = start
  while (cur <= endOfMonth(month) || weeks.length < 4) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cur, i)))
    cur = addDays(cur, 7)
    if (cur > endOfMonth(month) && weeks.length >= 4) break
  }
  return weeks
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const hoje = startOfDay(new Date())
const limite = addDays(hoje, 30)

export function DateSelector({ diasComDisponibilidade, onSelect, selected }: Props) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const grid = useMemo(() => buildGrid(viewMonth), [viewMonth])

  function canGoPrev() { return !isSameMonth(viewMonth, hoje) }
  function canGoNext() { return !isSameMonth(viewMonth, limite) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setViewMonth(m => subMonths(m, 1))} disabled={!canGoPrev()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold capitalize">
          {format(viewMonth, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setViewMonth(m => addMonths(m, 1))} disabled={!canGoNext()}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DIAS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {grid.flat().map((date, idx) => {
          const dateStr = format(date, 'yyyy-MM-dd')
          const inMonth = isSameMonth(date, viewMonth)
          const inRange = !isAfter(date, limite) && !isAfter(hoje, date)
          const hasAvailability = diasComDisponibilidade.includes(date.getDay())
          const enabled = inMonth && inRange && hasAvailability
          const isSelected = selected === dateStr

          return (
            <button
              key={idx}
              disabled={!enabled}
              onClick={() => enabled && onSelect(dateStr)}
              className={cn(
                'mx-auto h-9 w-9 rounded-full text-sm font-medium transition-all',
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : enabled
                  ? 'hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-950/30 text-foreground'
                  : 'text-muted-foreground opacity-30 cursor-not-allowed',
                isToday(date) && !isSelected ? 'ring-2 ring-indigo-400 ring-offset-1' : '',
                !inMonth ? 'opacity-20' : ''
              )}
            >
              {format(date, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
