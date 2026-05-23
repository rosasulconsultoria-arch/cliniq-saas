'use client'

import { useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import { ReservaLocalSchema, type ReservaLocalFormData, DIAS_SEMANA_LABELS } from '@/lib/schemas/reserva-local'
import {
  criarReservaLocal,
  atualizarReservaLocal,
  deletarReservaLocal,
} from '@/app/(dashboard)/locais/[id]/reservas/actions'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface ProfissionalItem { id: string; nome: string }

export interface ReservaExistente {
  id: string
  profissionalId: string
  diaSemana: number
  horaInicio: string
  horaFim: string
  vigenciaInicio: Date | null
  vigenciaFim: Date | null
  ativa: boolean
}

interface Props {
  localId: string
  profissionais: ProfissionalItem[]
  reserva?: ReservaExistente
  open: boolean
  onClose: () => void
}

export function ReservaSheet({ localId, profissionais, reserva, open, onClose }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isDeletando, startDeleteTransition] = useTransition()
  const isEdit = !!reserva

  const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ReservaLocalFormData>({
    resolver: zodResolver(ReservaLocalSchema) as any,
    defaultValues: reserva ? {
      profissionalId: reserva.profissionalId,
      diaSemana:      reserva.diaSemana,
      horaInicio:     reserva.horaInicio,
      horaFim:        reserva.horaFim,
      vigenciaInicio: reserva.vigenciaInicio ? reserva.vigenciaInicio.toISOString().slice(0, 10) : null,
      vigenciaFim:    reserva.vigenciaFim    ? reserva.vigenciaFim.toISOString().slice(0, 10)    : null,
      ativa:          reserva.ativa,
    } : {
      profissionalId: '',
      diaSemana:      1,
      horaInicio:     '08:00',
      horaFim:        '09:00',
      vigenciaInicio: null,
      vigenciaFim:    null,
      ativa:          true,
    },
  })

  function handleClose() {
    if (isDirty && !confirm('Descartar alterações não salvas?')) return
    reset()
    onClose()
  }

  function onSubmit(data: ReservaLocalFormData) {
    startTransition(async () => {
      const result = isEdit && reserva
        ? await atualizarReservaLocal(reserva.id, localId, data)
        : await criarReservaLocal(localId, data)
      if (result?.error) { toast.error(result.error); return }
      toast.success(isEdit ? 'Reserva atualizada!' : 'Reserva criada!')
      reset()
      onClose()
    })
  }

  function handleDelete() {
    if (!reserva) return
    startDeleteTransition(async () => {
      await deletarReservaLocal(reserva.id, localId)
      toast.success('Reserva excluída.')
      reset()
      onClose()
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="flex flex-col overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>{isEdit ? 'Editar Reserva' : 'Nova Reserva'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 gap-5">
          <div className="space-y-1.5">
            <Label>Profissional *</Label>
            <Controller
              control={control}
              name="profissionalId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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

          <div className="space-y-1.5">
            <Label>Dia da semana *</Label>
            <Controller
              control={control}
              name="diaSemana"
              render={({ field }) => (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA_LABELS.map((label, i) => (
                      <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início *</Label>
              <Input type="time" {...register('horaInicio')} />
              {errors.horaInicio && <p className="text-xs text-destructive">{errors.horaInicio.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Fim *</Label>
              <Input type="time" {...register('horaFim')} />
              {errors.horaFim && <p className="text-xs text-destructive">{errors.horaFim.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Vigência <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">A partir de</Label>
                <Input type="date" {...register('vigenciaInicio')} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Até</Label>
                <Input type="date" {...register('vigenciaFim')} />
                {errors.vigenciaFim && <p className="text-xs text-destructive">{errors.vigenciaFim.message}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium">Reserva ativa</p>
              <p className="text-xs text-muted-foreground">Reservas inativas não bloqueiam o horário</p>
            </div>
            <Controller
              control={control}
              name="ativa"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>

          <SheetFooter className="flex-col gap-2 sm:flex-col mt-auto pt-2">
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Salvar Alterações' : 'Criar Reserva'}
              </Button>
            </div>

            {isEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={isDeletando}
                  >
                    {isDeletando
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <Trash2 className="mr-2 h-4 w-4" />}
                    Excluir reserva
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir reserva?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir esta reserva? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
