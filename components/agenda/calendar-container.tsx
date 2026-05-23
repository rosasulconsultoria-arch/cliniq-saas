'use client'

import { useState, useTransition, useCallback } from 'react'
import {
  addWeeks, subWeeks, addMonths, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfDay, endOfDay, addDays, subDays, format, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid, RefreshCw, Plus, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WeeklyView } from './weekly-view'
import { MonthlyView } from './monthly-view'
import { RoomGridView } from './room-grid-view'
import { AgendamentoDialog } from './appointment-dialog'
import { AppointmentDetailsDialog } from './appointment-details-dialog'
import { getAgendamentos } from '@/app/(dashboard)/agenda/actions'
import type { AgendamentoDisplay } from '@/types/agenda'

type View = 'rooms' | 'weekly' | 'monthly'
type Agendamento = AgendamentoDisplay

interface ProfissionalItem { id: string; nome: string; valorConsultaPadrao: number | null; tipoVinculo: string }
interface LocalItem { id: string; nome: string }

interface Props {
  agendamentosInicial: Agendamento[]
  profissionais: ProfissionalItem[]
  locais: LocalItem[]
  userRole: string
  userProfissionalId?: string
}

function buildMonthGrid(date: Date): Date[][] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 })
  const end = endOfMonth(date)
  const weeks: Date[][] = []
  let cur = start
  while (cur <= end || weeks.length < 4) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cur, i)))
    cur = addDays(cur, 7)
    if (cur > end && weeks.length >= 4) break
  }
  return weeks
}

export function CalendarContainer({ agendamentosInicial, profissionais, locais, userRole, userProfissionalId }: Props) {
  const router = useRouter()
  const [view, setView] = useState<View>('rooms')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(agendamentosInicial)
  const [profissionalFilter, setProfissionalFilter] = useState('')
  const [localFilter, setLocalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, startTransition] = useTransition()

  // Dialog state
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [newDialogSlot, setNewDialogSlot] = useState<{ date: Date; time: string; localId?: string } | null>(null)
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null)

  // Week days for weekly view
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthGrid = buildMonthGrid(currentDate)

  const fetchData = useCallback((date: Date) => {
    startTransition(async () => {
      const inicio = view === 'weekly' ? startOfWeek(date, { weekStartsOn: 1 }) : view === 'monthly' ? startOfMonth(date) : startOfDay(date)
      const fim = view === 'weekly' ? endOfWeek(date, { weekStartsOn: 1 }) : view === 'monthly' ? endOfMonth(date) : endOfDay(date)
      const data = await getAgendamentos({
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
        profissionalId: profissionalFilter || undefined,
        localId: localFilter || undefined,
        status: statusFilter || undefined,
        userRole,
        userProfissionalId,
      })
      setAgendamentos(data as Agendamento[])
    })
  }, [view, profissionalFilter, localFilter, statusFilter, userRole, userProfissionalId])

  function navigate(direction: 'prev' | 'next' | 'today') {
    let newDate: Date
    if (direction === 'today') {
      newDate = new Date()
    } else if (view === 'weekly') {
      newDate = direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1)
    } else if (view === 'monthly') {
      newDate = direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1)
    } else {
      newDate = direction === 'prev' ? subDays(currentDate, 1) : addDays(currentDate, 1)
    }
    setCurrentDate(newDate)
    fetchData(newDate)
  }

  function handleSlotClick(date: Date, time: string, localId?: string) {
    setNewDialogSlot({ date, time, localId })
    setNewDialogOpen(true)
  }

  function handleAppointmentClick(apt: Agendamento) {
    setSelectedAgendamento(apt)
  }

  function handleDayClick(date: Date) {
    setCurrentDate(date)
    setView('weekly')
    fetchData(date)
  }

  function handleSuccess() {
    fetchData(currentDate)
    router.refresh()
  }

  const periodLabel = view === 'weekly'
    ? `${format(weekDays[0], "d 'de' MMM", { locale: ptBR })} — ${format(weekDays[6], "d 'de' MMM", { locale: ptBR })}`
    : view === 'monthly'
    ? format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
    : format(currentDate, "d 'de' MMM", { locale: ptBR })

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <Button size="sm" onClick={() => { setNewDialogSlot(null); setNewDialogOpen(true) }}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Agendamento
        </Button>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navigate('prev')}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => navigate('today')}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={() => navigate('next')}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <span className="text-sm font-semibold capitalize min-w-32">{periodLabel}</span>

        <div className="flex items-center gap-1 ml-auto">
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}

          {/* Filters — hide from PROFISSIONAL */}
          {userRole !== 'PROFISSIONAL' && (
            <Select value={profissionalFilter} onValueChange={(v) => { setProfissionalFilter(v); fetchData(currentDate) }}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Profissional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {profissionais.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Select value={localFilter} onValueChange={(v) => { setLocalFilter(v); fetchData(currentDate) }}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Local" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {locais.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); fetchData(currentDate) }}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="AGENDADO">Agendado</SelectItem>
              <SelectItem value="CONFIRMADO">Confirmado</SelectItem>
              <SelectItem value="REALIZADO">Realizado</SelectItem>
              <SelectItem value="CANCELADO">Cancelado</SelectItem>
              <SelectItem value="FALTOU">Faltou</SelectItem>
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <Button variant={view === 'rooms' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8 px-2" onClick={() => setView('rooms')} title="Visão por locais">
              <Building2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant={view === 'weekly' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8 px-2" onClick={() => setView('weekly')} title="Visão semanal">
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button variant={view === 'monthly' ? 'default' : 'ghost'} size="sm" className="rounded-none h-8 px-2" onClick={() => setView('monthly')} title="Visão mensal">
              <Calendar className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar area */}
      <div className="flex-1 rounded-lg border bg-card overflow-hidden flex flex-col">
        {view === 'rooms' ? (
          <RoomGridView
            agendamentos={agendamentos}
            locais={locais}
            currentDate={currentDate}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
          />
        ) : view === 'weekly' ? (
          <WeeklyView
            agendamentos={agendamentos}
            weekDays={weekDays}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
          />
        ) : (
          <MonthlyView
            agendamentos={agendamentos}
            monthGrid={monthGrid}
            currentDate={currentDate}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {/* Dialogs */}
      <AgendamentoDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        slot={newDialogSlot}
        profissionais={profissionais}
        locais={locais}
        userRole={userRole}
        userProfissionalId={userProfissionalId}
        onSuccess={handleSuccess}
      />

      <AppointmentDetailsDialog
        agendamento={selectedAgendamento}
        open={!!selectedAgendamento}
        onClose={() => setSelectedAgendamento(null)}
        onSuccess={handleSuccess}
        userRole={userRole}
        userProfissionalId={userProfissionalId}
      />
    </div>
  )
}
