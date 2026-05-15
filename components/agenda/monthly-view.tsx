'use client'

import { isSameDay, isSameMonth, isToday, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Agendamento {
  id: string
  dataHoraInicio: string
  status: string
  paciente: { nome: string }
}

interface Props {
  agendamentos: Agendamento[]
  monthGrid: Date[][]
  currentDate: Date
  onDayClick: (date: Date) => void
}

const STATUS_DOT: Record<string, string> = {
  AGENDADO: 'bg-blue-500',
  CONFIRMADO: 'bg-emerald-500',
  REALIZADO: 'bg-slate-400',
  CANCELADO: 'bg-red-400',
  FALTOU: 'bg-amber-500',
}

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function MonthlyView({ agendamentos, monthGrid, currentDate, onDayClick }: Props) {
  function dayAppointments(day: Date) {
    return agendamentos.filter((a) => isSameDay(parseISO(a.dataHoraInicio), day))
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DIAS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1">
        {monthGrid.flat().map((day, idx) => {
          const apts = dayAppointments(day)
          const inMonth = isSameMonth(day, currentDate)
          const today = isToday(day)

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[100px] p-1.5 border-r border-b cursor-pointer hover:bg-accent/40 transition-colors',
                !inMonth && 'opacity-40 bg-muted/20',
                today && 'bg-primary/5'
              )}
              onClick={() => onDayClick(day)}
            >
              <div className={cn('w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1', today ? 'bg-primary text-primary-foreground' : 'text-foreground')}>
                {format(day, 'd')}
              </div>

              {apts.length > 0 && (
                <div className="space-y-0.5">
                  {apts.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className={cn('text-[10px] rounded px-1 py-0.5 truncate font-medium', STATUS_DOT[a.status]?.replace('bg-', 'bg-') + ' bg-opacity-20', 'text-foreground/80')}
                    >
                      <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1', STATUS_DOT[a.status])} />
                      {format(parseISO(a.dataHoraInicio), 'HH:mm')} {a.paciente.nome}
                    </div>
                  ))}
                  {apts.length > 3 && (
                    <p className="text-[10px] text-muted-foreground pl-1">+{apts.length - 3} mais</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
