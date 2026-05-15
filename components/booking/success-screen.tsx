'use client'

import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle, Calendar, Clock, User, Mail } from 'lucide-react'

interface Props {
  nomePaciente: string
  nomeProfissional: string
  dataHoraInicio: string
  dataHoraFim: string
  email?: string
}

export function SuccessScreen({ nomePaciente, nomeProfissional, dataHoraInicio, dataHoraFim, email }: Props) {
  const inicio = parseISO(dataHoraInicio)
  const fim = parseISO(dataHoraFim)

  return (
    <div className="text-center space-y-6 py-4 animate-in fade-in duration-500">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Agendado!</h2>
        <p className="text-muted-foreground">
          {nomePaciente}, seu agendamento foi confirmado com sucesso.
        </p>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border bg-card p-5 text-left space-y-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profissional</p>
            <p className="font-semibold text-sm">{nomeProfissional}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data</p>
            <p className="font-semibold text-sm capitalize">
              {format(inicio, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Horário</p>
            <p className="font-semibold text-sm">
              {format(inicio, 'HH:mm')} – {format(fim, 'HH:mm')}
            </p>
          </div>
        </div>
      </div>

      {email && (
        <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>Confirmação enviada para <strong>{email}</strong></span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Para cancelar, use o link enviado no e-mail de confirmação.
      </p>
    </div>
  )
}
