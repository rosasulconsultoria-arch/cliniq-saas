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
      tipoCobranca: 'CONSULTA',
      totalSessoes: null,
      formaPagamento: null,
      bandeiraCartao: null,
      numeroParcelas: 1,
      taxaCartaoPerc: null,
      origem: 'INTERNO',
      profissionalId: userRole === 'PROFISSIONAL' && userProfissionalId ? userProfissionalId : '',
      pacienteId: '',
      salaId: '',
    },
  })

  const { watch, setValue, control, register, handleSubmit, reset, formState: { errors } } = form
  const tipoCobranca = watch('tipoCobranca')
  const formaPagamento = watch('formaPagamento')
  const isCartao = formaPagamento === 'CARTAO_CREDITO' || formaPagamento === 'CARTAO_DEBITO'
  const isCredito = formaPagamento === 'CARTAO_CREDITO'

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
      if ((result as any).whatsappLink) {
        toast('Enviar confirmação por WhatsApp?', {
          action: { label: 'Abrir WhatsApp', onClick: () => window.open((result as any).whatsappLink, '_blank') },
          duration: 8000,
        })
      }
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

          {/* Tipo de cobrança */}
          <div className="space-y-1.5">
            <Label>Tipo de cobrança</Label>
            <Controller
              control={control}
              name="tipoCobranca"
              render={({ field }) => (
                <Select value={field.value} onValueChange={v => { field.onChange(v); if (v === 'CONSULTA') setValue('totalSessoes', null) }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONSULTA">Consulta avulsa</SelectItem>
                    <SelectItem value="PACOTE">Pacote de sessões (valor único)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Valor + Sessões */}
          <div className={tipoCobranca === 'PACOTE' ? 'grid grid-cols-2 gap-3' : ''}>
            <div className="space-y-1.5">
              <Label>{tipoCobranca === 'PACOTE' ? 'Valor total do pacote (R$)' : 'Valor (R$)'}</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" {...register('valor', { valueAsNumber: true })} />
              {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
            </div>
            {tipoCobranca === 'PACOTE' && (
              <div className="space-y-1.5">
                <Label>Número de sessões *</Label>
                <Input type="number" min="2" step="1" placeholder="Ex: 10" {...register('totalSessoes', { valueAsNumber: true })} />
                {errors.totalSessoes && <p className="text-xs text-destructive">{errors.totalSessoes.message}</p>}
              </div>
            )}
          </div>

          {/* Pagamento */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Forma de Pagamento</Label>
              <Controller control={control} name="formaPagamento" render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={v => {
                  field.onChange(v || null)
                  if (v !== 'CARTAO_CREDITO') setValue('numeroParcelas', 1)
                  if (v !== 'CARTAO_CREDITO' && v !== 'CARTAO_DEBITO') { setValue('bandeiraCartao', null); setValue('taxaCartaoPerc', null) }
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    <SelectItem value="PIX">Pix</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferência Bancária</SelectItem>
                    <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                    <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>

            {isCartao && (
              <div className="grid grid-cols-2 gap-3 pl-2 border-l-2 border-indigo-100">
                <div className="space-y-1.5">
                  <Label>Bandeira</Label>
                  <Controller control={control} name="bandeiraCartao" render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={v => field.onChange(v || null)}>
                      <SelectTrigger><SelectValue placeholder="Bandeira..." /></SelectTrigger>
                      <SelectContent>
                        {['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Outro'].map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label>Taxa (%)</Label>
                  <Input type="number" min="0" max="20" step="0.01" placeholder="Ex: 2.5" {...register('taxaCartaoPerc', { valueAsNumber: true })} />
                </div>
                {isCredito && (
                  <div className="space-y-1.5">
                    <Label>Parcelas</Label>
                    <Input type="number" min="1" max="48" step="1" placeholder="1" {...register('numeroParcelas', { valueAsNumber: true })} />
                  </div>
                )}
              </div>
            )}
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
