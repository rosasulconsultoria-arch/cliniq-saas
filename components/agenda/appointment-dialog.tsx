'use client'

import { useEffect, useTransition, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Loader2, UserPlus, X, RefreshCw } from 'lucide-react'
import { AgendamentoSchema, type AgendamentoFormData } from '@/lib/schemas/agendamento'
import { criarAgendamento } from '@/app/(dashboard)/agenda/actions'
import { criarPacienteRapido } from '@/app/(dashboard)/pacientes/actions'
import { mascaraTelefone } from '@/lib/utils'
import { PacienteCombobox } from './paciente-combobox'
import { ServicoMultiselect } from './servico-multiselect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const totalMin = 8 * 60 + i * 30
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
})

const DURATION_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '50 min', value: 50 },
  { label: '60 min (1h)', value: 60 },
  { label: '90 min (1h30)', value: 90 },
  { label: '120 min (2h)', value: 120 },
]

interface ProfissionalItem { id: string; nome: string; valorConsultaPadrao: number | null; tipoVinculo: string }
interface SalaItem { id: string; nome: string }

interface Props {
  open: boolean
  onClose: () => void
  slot: { date: Date; time: string; salaId?: string } | null
  profissionais: ProfissionalItem[]
  salas: SalaItem[]
  userRole: string
  userProfissionalId?: string
  onSuccess: () => void
}

export function AgendamentoDialog({ open, onClose, slot, profissionais, salas, userRole, userProfissionalId, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isCadastrando, startCadastroTransition] = useTransition()

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [showCadastro, setShowCadastro] = useState(false)
  const [nomeCadastro, setNomeCadastro] = useState('')
  const [telefoneCadastro, setTelefoneCadastro] = useState('')

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
      dataHoraInicio: '',
      recorrente: false,
      totalRecorrencias: 4,
      servicoIds: [],
    },
  })

  const { watch, setValue, control, register, handleSubmit, reset, formState: { errors } } = form
  const tipoCobranca = watch('tipoCobranca')
  const formaPagamento = watch('formaPagamento')
  const recorrente = watch('recorrente')
  const totalRecorrencias = watch('totalRecorrencias')
  const isCartao = formaPagamento === 'CARTAO_CREDITO' || formaPagamento === 'CARTAO_DEBITO'
  const isCredito = formaPagamento === 'CARTAO_CREDITO'

  // Timezone fix: convert local date+time to UTC ISO before storing
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const [y, mo, d] = selectedDate.split('-').map(Number)
      const [h, m] = selectedTime.split(':').map(Number)
      setValue('dataHoraInicio', new Date(y, mo - 1, d, h, m, 0).toISOString())
    } else {
      setValue('dataHoraInicio', '')
    }
  }, [selectedDate, selectedTime, setValue])

  // Pre-fill from slot click on calendar
  useEffect(() => {
    if (slot && open) {
      setSelectedDate(format(slot.date, 'yyyy-MM-dd'))
      setSelectedTime(slot.time)
      if (slot.salaId) setValue('salaId', slot.salaId)
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
    if (!open) {
      reset()
      setSelectedDate('')
      setSelectedTime('')
      setShowCadastro(false)
      setNomeCadastro('')
      setTelefoneCadastro('')
    }
  }, [open, reset])

  function handleCadastrarPaciente() {
    if (!nomeCadastro.trim() || !telefoneCadastro.trim()) {
      toast.error('Nome e telefone são obrigatórios')
      return
    }
    startCadastroTransition(async () => {
      const result = await criarPacienteRapido({ nome: nomeCadastro.trim(), telefone: telefoneCadastro.trim() })
      if ('error' in result) { toast.error(result.error); return }
      setValue('pacienteId', result.id)
      setShowCadastro(false)
      setNomeCadastro('')
      setTelefoneCadastro('')
      toast.success(`${result.nome} cadastrado e selecionado!`)
    })
  }

  function onSubmit(data: AgendamentoFormData) {
    if (!data.dataHoraInicio) { toast.error('Selecione data e horário'); return }
    startTransition(async () => {
      const result = await criarAgendamento(data)
      if (result?.error) { toast.error(result.error); return }
      if ((result as any).count) {
        toast.success(`${(result as any).count} agendamentos recorrentes criados!`)
        onClose(); onSuccess(); return
      }
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

          {/* 1. Paciente */}
          <div className="space-y-1.5">
            <Label>Paciente *</Label>
            <Controller
              control={control}
              name="pacienteId"
              render={({ field }) => (
                <PacienteCombobox
                  value={field.value}
                  onChange={(id) => { field.onChange(id); setShowCadastro(false) }}
                  onCadastrar={(nome) => { setNomeCadastro(nome); setShowCadastro(true) }}
                />
              )}
            />
            {errors.pacienteId && <p className="text-xs text-destructive">{errors.pacienteId.message}</p>}
          </div>

          {/* Inline patient registration */}
          {showCadastro && (
            <div className="rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-700 dark:text-indigo-400">
                  <UserPlus className="h-4 w-4" />
                  Cadastrar novo paciente
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCadastro(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    placeholder="Nome completo"
                    value={nomeCadastro}
                    onChange={(e) => setNomeCadastro(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Telefone *</Label>
                  <Input
                    placeholder="(11) 99999-9999"
                    value={telefoneCadastro}
                    onChange={(e) => setTelefoneCadastro(mascaraTelefone(e.target.value))}
                    maxLength={15}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowCadastro(false)}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" onClick={handleCadastrarPaciente} disabled={isCadastrando}>
                  {isCadastrando && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                  Cadastrar e selecionar
                </Button>
              </div>
            </div>
          )}

          {/* 2. Profissional */}
          <div className="space-y-1.5">
            <Label>Profissional *</Label>
            <Controller
              control={control}
              name="profissionalId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={userRole === 'PROFISSIONAL'}>
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

          {/* 3. Data + Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data *</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Horário *</Label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {errors.dataHoraInicio && <p className="text-xs text-destructive">{errors.dataHoraInicio.message}</p>}

          {/* 4. Duração + Sala */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Duração</Label>
              <Controller
                control={control}
                name="duracao"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
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
          </div>

          {/* 5. Serviços */}
          <div className="space-y-1.5">
            <Label>Serviços prestados</Label>
            <Controller
              control={control}
              name="servicoIds"
              render={({ field }) => (
                <ServicoMultiselect value={field.value ?? []} onChange={field.onChange} />
              )}
            />
          </div>

          {/* 6. Recorrência */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Agendamento recorrente</p>
                <p className="text-xs text-muted-foreground">Repete toda semana no mesmo dia e horário</p>
              </div>
              <Controller
                control={control}
                name="recorrente"
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            {recorrente && (
              <div className="space-y-3 pl-3 border-l-2 border-indigo-200">
                <div className="space-y-1.5">
                  <Label>Número de sessões</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={2}
                      max={52}
                      className="w-24"
                      {...register('totalRecorrencias', { valueAsNumber: true })}
                    />
                    <span className="text-sm text-muted-foreground">sessões (máx. 52)</span>
                  </div>
                </div>
                {selectedDate && selectedTime && totalRecorrencias >= 2 && (
                  <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-md px-3 py-2">
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    <span>
                      {totalRecorrencias} sessões toda{' '}
                      <strong>
                        {format(parseISO(selectedDate), 'EEEE', { locale: ptBR })}
                      </strong>{' '}
                      às <strong>{selectedTime}</strong> — de{' '}
                      {format(parseISO(selectedDate), 'dd/MM/yyyy')} até{' '}
                      {format(new Date(parseISO(selectedDate).getTime() + (totalRecorrencias - 1) * 7 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <Separator />

          {/* 7. Tipo de cobrança */}
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

          {/* 6. Valor + Sessões */}
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

          {/* 7. Forma de pagamento */}
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

          {/* 8. Observações */}
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
