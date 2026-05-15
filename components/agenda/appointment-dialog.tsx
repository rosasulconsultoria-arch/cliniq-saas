'use client'

import { useEffect, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { AgendamentoSchema, type AgendamentoFormData } from '@/lib/schemas/agendamento'
import { criarAgendamento } from '@/app/(dashboard)/agenda/actions'
import { PacienteCombobox } from './paciente-combobox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ProfissionalItem {
  id: string
  nome: string
  valorConsultaPadrao: number | null
  tipoVinculo: string
}
interface SalaItem { id: string; nome: string }

interface Props {
  open: boolean
  onClose: () => void
  slot: { date: Date; time: string } | null
  profissionais: ProfissionalItem[]
  salas: SalaItem[]
  userRole: string
  userProfissionalId?: string
  onSuccess: () => void
}

export function AgendamentoDialog({ open, onClose, slot, profissionais, salas, userRole, userProfissionalId, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<AgendamentoFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(AgendamentoSchema) as any,
    defaultValues: {
      duracao: 50,
      valor: 0,
      origem: 'INTERNO',
      profissionalId: userRole === 'PROFISSIONAL' && userProfissionalId ? userProfissionalId : '',
      pacienteId: '',
      salaId: '',
    },
  })

  const { watch, setValue, control, register, handleSubmit, reset, formState: { errors } } = form

  // Pre-fill date/time from clicked slot
  useEffect(() => {
    if (slot && open) {
      const [h, m] = slot.time.split(':').map(Number)
      const dt = new Date(slot.date)
      dt.setHours(h, m, 0, 0)
      const formatted = `${format(dt, 'yyyy-MM-dd')}T${format(dt, 'HH:mm')}`
      setValue('dataHoraInicio', formatted)
    }
  }, [slot, open, setValue])

  // Auto-fill valor from profissional
  const profissionalId = watch('profissionalId')
  useEffect(() => {
    const prof = profissionais.find((p) => p.id === profissionalId)
    if (prof?.valorConsultaPadrao) setValue('valor', prof.valorConsultaPadrao)
  }, [profissionalId, profissionais, setValue])

  // Reset on close
  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  function onSubmit(data: AgendamentoFormData) {
    startTransition(async () => {
      const result = await criarAgendamento(data)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Agendamento criado!')
      onClose()
      onSuccess()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Profissional */}
          <div className="space-y-1.5">
            <Label>Profissional *</Label>
            <Controller
              control={control}
              name="profissionalId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={userRole === 'PROFISSIONAL'}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {profissionais.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.profissionalId && <p className="text-xs text-destructive">{errors.profissionalId.message}</p>}
          </div>

          {/* Paciente */}
          <div className="space-y-1.5">
            <Label>Paciente *</Label>
            <Controller
              control={control}
              name="pacienteId"
              render={({ field }) => (
                <PacienteCombobox
                  value={field.value}
                  onChange={(id) => field.onChange(id)}
                />
              )}
            />
            {errors.pacienteId && <p className="text-xs text-destructive">{errors.pacienteId.message}</p>}
          </div>

          {/* Sala */}
          <div className="space-y-1.5">
            <Label>Sala *</Label>
            <Controller
              control={control}
              name="salaId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {salas.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.salaId && <p className="text-xs text-destructive">{errors.salaId.message}</p>}
          </div>

          {/* Data/Hora + Duração */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data e Hora *</Label>
              <Input type="datetime-local" {...register('dataHoraInicio')} />
              {errors.dataHoraInicio && <p className="text-xs text-destructive">{errors.dataHoraInicio.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Duração (min)</Label>
              <Input type="number" min="30" step="10" {...register('duracao', { valueAsNumber: true })} />
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-1.5">
            <Label>Valor (R$)</Label>
            <Input type="number" min="0" step="0.01" placeholder="0.00" {...register('valor', { valueAsNumber: true })} />
            {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={2} placeholder="Informações adicionais..." {...register('observacoes')} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
