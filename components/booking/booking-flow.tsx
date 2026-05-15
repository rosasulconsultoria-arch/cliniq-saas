'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Clock, User } from 'lucide-react'
import { toast } from 'sonner'
import { getHorariosAction, agendarPublico } from '@/app/(public)/agendar/[slug]/actions'
import { DateSelector } from './date-selector'
import { TimeSlots } from './time-slots'
import { PatientForm } from './patient-form'
import { SuccessScreen } from './success-screen'
import { cn } from '@/lib/utils'

interface ProfissionalInfo {
  id: string
  nome: string
  nomeProfissional: string
  dataHoraInicio?: string
  dataHoraFim?: string
}

interface Props {
  profissionalId: string
  nomeProfissional: string
  diasComDisponibilidade: number[]
}

type Step = 'date' | 'time' | 'form' | 'success'

interface SuccessData {
  nomePaciente: string
  dataHoraInicio: string
  dataHoraFim: string
  email?: string
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string; icon: typeof Calendar }[] = [
    { key: 'date', label: 'Data', icon: Calendar },
    { key: 'time', label: 'Horário', icon: Clock },
    { key: 'form', label: 'Dados', icon: User },
  ]
  const currentIdx = steps.findIndex(s => s.key === current)

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, idx) => {
        const done = idx < currentIdx
        const active = idx === currentIdx
        const Icon = step.icon
        return (
          <div key={step.key} className="flex items-center">
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              active ? 'bg-indigo-600 text-white shadow-sm' : done ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'text-muted-foreground'
            )}>
              <Icon className="h-3 w-3" />
              {step.label}
            </div>
            {idx < steps.length - 1 && (
              <div className={cn('w-8 h-0.5 mx-1', done || active ? 'bg-indigo-300' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export function BookingFlow({ profissionalId, nomeProfissional, diasComDisponibilidade }: Props) {
  const [step, setStep] = useState<Step>('date')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isLoadingSlots, startLoadingSlots] = useTransition()
  const [isSubmitting, startSubmit] = useTransition()
  const [successData, setSuccessData] = useState<SuccessData | null>(null)

  function handleDateSelect(date: string) {
    setSelectedDate(date)
    setSelectedTime(null)
    setStep('time')
    startLoadingSlots(async () => {
      const slots = await getHorariosAction(profissionalId, date)
      setAvailableSlots(slots)
    })
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time)
    setStep('form')
  }

  function handleSubmit(pacienteData: Record<string, unknown>) {
    if (!selectedDate || !selectedTime) return
    startSubmit(async () => {
      const result = await agendarPublico({
        profissionalId,
        data: selectedDate,
        horario: selectedTime,
        pacienteData,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setSuccessData({
        nomePaciente: String(pacienteData.nome ?? ''),
        dataHoraInicio: buildDateTime(selectedDate, selectedTime),
        dataHoraFim: buildDateTime(selectedDate, selectedTime, 50),
        email: pacienteData.email ? String(pacienteData.email) : undefined,
      })
      setStep('success')
    })
  }

  if (step === 'success' && successData) {
    return (
      <SuccessScreen
        nomePaciente={successData.nomePaciente}
        nomeProfissional={nomeProfissional}
        dataHoraInicio={successData.dataHoraInicio}
        dataHoraFim={successData.dataHoraFim}
        email={successData.email}
      />
    )
  }

  return (
    <div className="space-y-0">
      <StepIndicator current={step} />

      {/* Date selection */}
      <section className={cn('rounded-2xl border bg-card p-5 shadow-sm transition-all', step === 'date' ? '' : 'opacity-80')}>
        <div className="flex items-center gap-2 mb-4">
          <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold', step === 'date' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')}>1</div>
          <h3 className="font-semibold text-sm">
            {selectedDate
              ? <button onClick={() => { setStep('date'); setSelectedDate(null); setSelectedTime(null) }} className="text-indigo-600 hover:underline capitalize">{format(parseISO(selectedDate), "d 'de' MMMM", { locale: ptBR })}</button>
              : 'Selecione uma data'}
          </h3>
        </div>
        {step === 'date' && (
          <DateSelector
            diasComDisponibilidade={diasComDisponibilidade}
            onSelect={handleDateSelect}
            selected={selectedDate}
          />
        )}
      </section>

      {/* Time selection */}
      {(step === 'time' || step === 'form') && selectedDate && (
        <div className="mt-4">
          <section className={cn('rounded-2xl border bg-card p-5 shadow-sm transition-all', step === 'time' ? '' : 'opacity-80')}>
            <div className="flex items-center gap-2 mb-4">
              <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold', step === 'time' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')}>2</div>
              <h3 className="font-semibold text-sm">
                {selectedTime
                  ? <button onClick={() => { setStep('time'); setSelectedTime(null) }} className="text-indigo-600 hover:underline">{selectedTime}</button>
                  : 'Escolha um horário'}
              </h3>
            </div>
            {step === 'time' && (
              <TimeSlots
                slots={availableSlots}
                selected={selectedTime}
                onSelect={handleTimeSelect}
                isLoading={isLoadingSlots}
              />
            )}
          </section>
        </div>
      )}

      {/* Patient form */}
      {step === 'form' && selectedDate && selectedTime && (
        <div className="mt-4">
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</div>
              <h3 className="font-semibold text-sm">Seus dados</h3>
            </div>
            <PatientForm onSubmit={handleSubmit as any} isSubmitting={isSubmitting} />
          </section>
        </div>
      )}
    </div>
  )
}

function buildDateTime(date: string, time: string, addMinutes = 0): string {
  const [ano, mes, dia] = date.split('-').map(Number)
  const [h, m] = time.split(':').map(Number)
  const dt = new Date(ano, mes - 1, dia, h, m + addMinutes, 0)
  return dt.toISOString()
}
