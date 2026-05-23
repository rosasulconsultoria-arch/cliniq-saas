'use client'

import { useMemo } from 'react'
import { parseISO, isSameDay, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { AgendamentoDisplay } from '@/types/agenda'

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const totalMin = 8 * 60 + i * 30
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
})

interface LocalItem { id: string; nome: string }
type DoorState = 'livre' | 'agendado' | 'em-atendimento'

interface Props {
  agendamentos: AgendamentoDisplay[]
  locais: LocalItem[]
  currentDate: Date
  onSlotClick: (date: Date, time: string, localId: string) => void
  onAppointmentClick: (apt: AgendamentoDisplay) => void
}

function Door({ state }: { state: DoorState }) {
  return (
    <div className={cn(
      'w-6 h-8 rounded-t border-2 relative flex-shrink-0',
      state === 'livre'            && 'border-emerald-400 bg-emerald-100 dark:bg-emerald-950/40',
      state === 'agendado'         && 'border-red-400 bg-red-100 dark:bg-red-950/40',
      state === 'em-atendimento'   && 'border-amber-400 bg-amber-100 dark:bg-amber-950/40',
    )}>
      {/* knob */}
      <div className={cn(
        'absolute right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full',
        state === 'livre'          && 'bg-emerald-500',
        state === 'agendado'       && 'bg-red-500',
        state === 'em-atendimento' && 'bg-amber-500',
      )} />
      {/* hinges */}
      <div className={cn('absolute left-0.5 top-1.5 w-0.5 h-1.5 rounded-full opacity-50',
        state === 'livre'          && 'bg-emerald-400',
        state === 'agendado'       && 'bg-red-400',
        state === 'em-atendimento' && 'bg-amber-400',
      )} />
      <div className={cn('absolute left-0.5 bottom-1.5 w-0.5 h-1.5 rounded-full opacity-50',
        state === 'livre'          && 'bg-emerald-400',
        state === 'agendado'       && 'bg-red-400',
        state === 'em-atendimento' && 'bg-amber-400',
      )} />
    </div>
  )
}

export function RoomGridView({ agendamentos, locais, currentDate, onSlotClick, onAppointmentClick }: Props) {
  const now = new Date()

  const dayApts = useMemo(
    () => agendamentos.filter(a => isSameDay(parseISO(a.dataHoraInicio), currentDate)),
    [agendamentos, currentDate],
  )

  function getApt(localId: string, slot: string): AgendamentoDisplay | null {
    const [h, m] = slot.split(':').map(Number)
    const slotStart = new Date(currentDate)
    slotStart.setHours(h, m, 0, 0)
    const slotEnd = new Date(slotStart.getTime() + 30 * 60_000)
    return dayApts.find(a => {
      if (a.sala.id !== localId || a.status === 'CANCELADO') return false
      const s = parseISO(a.dataHoraInicio)
      const e = parseISO(a.dataHoraFim)
      return s < slotEnd && e > slotStart
    }) ?? null
  }

  function doorState(apt: AgendamentoDisplay | null): DoorState {
    if (!apt) return 'livre'
    const s = parseISO(apt.dataHoraInicio)
    const e = parseISO(apt.dataHoraFim)
    return now >= s && now <= e ? 'em-atendimento' : 'agendado'
  }

  const dateLabel = format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day label */}
      <div className="px-4 py-2 border-b text-sm font-medium capitalize text-muted-foreground bg-card">
        {dateLabel}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-card shadow-sm">
            <tr>
              <th className="w-16 py-3 px-3 text-left text-xs font-medium text-muted-foreground border-b">
                Horário
              </th>
              {locais.map(local => (
                <th key={local.id} className="py-3 px-2 text-center text-xs font-semibold border-b border-l min-w-[110px]">
                  {local.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(time => (
              <tr key={time} className="border-b hover:bg-muted/20 transition-colors">
                <td className="py-1.5 px-3 text-xs text-muted-foreground font-mono tabular-nums">
                  {time}
                </td>
                {locais.map(local => {
                  const apt = getApt(local.id, time)
                  const state = doorState(apt)
                  const tooltip = apt
                    ? `${apt.paciente.nome}\n${format(parseISO(apt.dataHoraInicio), 'HH:mm')}–${format(parseISO(apt.dataHoraFim), 'HH:mm')} · ${apt.profissional.nome}`
                    : 'Livre — clique para agendar'

                  return (
                    <td key={local.id} className="py-1 px-2 border-l text-center">
                      <button
                        className={cn(
                          'inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded transition-all w-full',
                          state === 'livre'          && 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
                          state === 'agendado'       && 'hover:bg-red-50 dark:hover:bg-red-950/20',
                          state === 'em-atendimento' && 'hover:bg-amber-50 dark:hover:bg-amber-950/20',
                        )}
                        title={tooltip}
                        onClick={() => apt ? onAppointmentClick(apt) : onSlotClick(currentDate, time, local.id)}
                      >
                        <Door state={state} />
                        {apt && (
                          <span className={cn(
                            'text-[9px] leading-tight max-w-[90px] truncate font-medium',
                            state === 'agendado'       && 'text-red-600 dark:text-red-400',
                            state === 'em-atendimento' && 'text-amber-600 dark:text-amber-400',
                          )}>
                            {apt.paciente.nome.split(' ')[0]}
                          </span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-2 border-t bg-card text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-4 rounded-t border-2 border-emerald-400 bg-emerald-100" />
          Livre
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-4 rounded-t border-2 border-red-400 bg-red-100" />
          Agendado
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-4 rounded-t border-2 border-amber-400 bg-amber-100" />
          Em atendimento
        </div>
      </div>
    </div>
  )
}
