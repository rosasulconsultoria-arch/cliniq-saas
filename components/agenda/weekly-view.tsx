'use client'

import { useMemo, useState, useRef } from 'react'
import { parseISO, isSameDay, isToday, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { AgendamentoDisplay } from '@/types/agenda'

const ROW_HEIGHT = 56 // px por 30min
const START_HOUR = 8
const END_HOUR = 20
const SLOTS_COUNT = (END_HOUR - START_HOUR) * 2 // 24 slots
const TOTAL_HEIGHT = SLOTS_COUNT * ROW_HEIGHT

const STATUS_COLORS: Record<string, string> = {
  AGENDADO: 'bg-blue-100 border-l-blue-500 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200',
  CONFIRMADO: 'bg-emerald-100 border-l-emerald-500 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
  REALIZADO: 'bg-slate-100 border-l-slate-400 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400',
  CANCELADO: 'bg-red-50 border-l-red-400 text-red-400 line-through opacity-60',
  FALTOU: 'bg-amber-100 border-l-amber-500 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
}

interface Props {
  agendamentos: AgendamentoDisplay[]
  weekDays: Date[]
  onSlotClick: (date: Date, time: string) => void
  onAppointmentClick: (apt: AgendamentoDisplay) => void
}

function getTop(dt: Date): number {
  const mins = dt.getHours() * 60 + dt.getMinutes() - START_HOUR * 60
  return Math.max(0, (mins / 30) * ROW_HEIGHT)
}

function getHeight(start: Date, end: Date): number {
  const mins = (end.getTime() - start.getTime()) / 60_000
  return Math.max(ROW_HEIGHT * 0.9, (mins / 30) * ROW_HEIGHT)
}

const TIME_LABELS = Array.from({ length: SLOTS_COUNT }, (_, i) => {
  const h = START_HOUR + Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${h.toString().padStart(2, '0')}:${m}`
})

export function WeeklyView({ agendamentos, weekDays, onSlotClick, onAppointmentClick }: Props) {
  const [activeDayIdx, setActiveDayIdx] = useState(() => {
    const t = weekDays.findIndex((d) => isToday(d))
    return t >= 0 ? t : 0
  })
  const scrollRef = useRef<HTMLDivElement>(null)
  const touchStart = useRef(0)

  // Mobile shows 1 day
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const visibleDays = isMobile ? [weekDays[activeDayIdx]] : weekDays

  function dayAppointments(day: Date) {
    return agendamentos.filter((a) => isSameDay(parseISO(a.dataHoraInicio), day))
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mobile nav */}
      <div className="flex items-center justify-between px-4 py-2 border-b md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setActiveDayIdx((i) => Math.max(0, i - 1))} disabled={activeDayIdx === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(weekDays[activeDayIdx], "EEEE, d 'de' MMMM", { locale: ptBR })}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setActiveDayIdx((i) => Math.min(6, i + 1))} disabled={activeDayIdx === 6}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Header — sticky */}
      <div className="flex border-b bg-card z-10 shrink-0">
        <div className="w-14 shrink-0" />
        {visibleDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn('flex-1 py-2 text-center border-l text-xs', isToday(day) && 'bg-primary/5')}
          >
            <div className="text-muted-foreground uppercase tracking-wide hidden md:block">
              {format(day, 'EEE', { locale: ptBR })}
            </div>
            <div className={cn('w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-semibold', isToday(day) ? 'bg-primary text-primary-foreground' : '')}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div
        ref={scrollRef}
        className="flex overflow-y-auto flex-1"
        onTouchStart={(e) => { touchStart.current = e.targetTouches[0].clientX }}
        onTouchEnd={(e) => {
          const diff = touchStart.current - e.changedTouches[0].clientX
          if (Math.abs(diff) > 60) {
            if (diff > 0) setActiveDayIdx((i) => Math.min(6, i + 1))
            else setActiveDayIdx((i) => Math.max(0, i - 1))
          }
        }}
      >
        {/* Time labels */}
        <div className="w-14 shrink-0 select-none">
          {TIME_LABELS.map((t, i) => (
            <div key={t} style={{ height: ROW_HEIGHT }} className="flex items-start justify-end pr-2 pt-1">
              {i % 2 === 0 && <span className="text-[10px] text-muted-foreground">{t}</span>}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {visibleDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn('flex-1 relative border-l', isToday(day) && 'bg-primary/5')}
            style={{ height: TOTAL_HEIGHT }}
          >
            {/* Grid lines + clickable slots */}
            {TIME_LABELS.map((label, i) => (
              <div
                key={label}
                className={cn(
                  'absolute w-full border-t cursor-pointer hover:bg-accent/40 transition-colors',
                  i % 2 === 0 ? 'border-border/60' : 'border-border/20'
                )}
                style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                onClick={() => onSlotClick(day, label)}
              />
            ))}

            {/* Appointments */}
            {dayAppointments(day).map((apt) => {
              const start = parseISO(apt.dataHoraInicio)
              const end = parseISO(apt.dataHoraFim)
              return (
                <button
                  key={apt.id}
                  className={cn(
                    'absolute rounded text-left text-xs px-1.5 py-1 cursor-pointer border-l-4 shadow-sm hover:shadow transition-shadow overflow-hidden z-10 w-[calc(100%-8px)]',
                    STATUS_COLORS[apt.status] ?? STATUS_COLORS.AGENDADO
                  )}
                  style={{ top: getTop(start) + 2, height: getHeight(start, end) - 4, left: 4 }}
                  onClick={(e) => { e.stopPropagation(); onAppointmentClick(apt) }}
                >
                  <div className="font-semibold truncate leading-tight">{format(start, 'HH:mm')} {apt.paciente.nome}</div>
                  <div className="flex items-center gap-1 truncate opacity-75 leading-tight">
                    {apt.profissional.foto ? (
                      <img src={apt.profissional.foto} alt="" className="h-3.5 w-3.5 rounded-full object-cover shrink-0 opacity-90" />
                    ) : (
                      <span className="h-3.5 w-3.5 rounded-full bg-current opacity-30 shrink-0 flex items-center justify-center text-[7px] font-bold">
                        {apt.profissional.nome.charAt(0)}
                      </span>
                    )}
                    <span className="truncate">{apt.profissional.nome}</span>
                  </div>
                  <div className="truncate opacity-60 leading-tight">{apt.sala.nome}</div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground shrink-0">
        {Object.entries({ AGENDADO: 'Agendado', CONFIRMADO: 'Confirmado', REALIZADO: 'Realizado', CANCELADO: 'Cancelado', FALTOU: 'Faltou' }).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-sm border-l-2', STATUS_COLORS[k])} />
            {v}
          </span>
        ))}
      </div>
    </div>
  )
}
