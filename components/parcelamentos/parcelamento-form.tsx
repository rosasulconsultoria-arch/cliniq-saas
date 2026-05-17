'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { ParcelamentoSchema, ParcelamentoFormData, BANDEIRAS } from '@/lib/schemas/parcelamento'
import { criarParcelamento } from '@/app/(dashboard)/profissionais/[id]/parcelamentos/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { format, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBRL } from '@/lib/utils'

interface Props {
  profissionalId: string
  open: boolean
  onClose: () => void
}

export function ParcelamentoForm({ profissionalId, open, onClose }: Props) {
  const [isPending, startTransition] = useTransition()

  const { register, control, watch, handleSubmit, reset, formState: { errors } } = useForm<ParcelamentoFormData>({
    resolver: zodResolver(ParcelamentoSchema) as any,
    defaultValues: {
      tipoPagamento: 'CREDITO',
      totalParcelas: 1,
      taxaCartao: 0,
      dataInicio: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const valorTotal = watch('valorTotal') ?? 0
  const taxaCartao = watch('taxaCartao') ?? 0
  const totalParcelas = watch('totalParcelas') ?? 1
  const tipoPagamento = watch('tipoPagamento')
  const dataInicio = watch('dataInicio')

  const valorLiquido = valorTotal * (1 - (taxaCartao ?? 0) / 100)
  const valorParcela = totalParcelas > 0 ? valorLiquido / totalParcelas : 0

  function onSubmit(data: ParcelamentoFormData) {
    startTransition(async () => {
      const result = await criarParcelamento(profissionalId, data)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Parcelamento criado!')
      reset()
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Parcelamento / Previsão de Recebimento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Descrição *</Label>
            <Input placeholder="Ex: Pacote 10 sessões — João Silva" {...register('descricao')} />
            {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Valor total (R$) *</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0,00" {...register('valorTotal', { valueAsNumber: true })} />
              {errors.valorTotal && <p className="text-xs text-destructive">{errors.valorTotal.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Nº de parcelas *</Label>
              <Input type="number" min="1" max="48" step="1" disabled={tipoPagamento === 'DEBITO'} {...register('totalParcelas', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Bandeira *</Label>
              <Controller control={control} name="bandeira" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {BANDEIRAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {errors.bandeira && <p className="text-xs text-destructive">{errors.bandeira.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Controller control={control} name="tipoPagamento" render={({ field }) => (
                <Select value={field.value} onValueChange={v => { field.onChange(v); if (v === 'DEBITO') { /* reset parcelas */ } }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREDITO">Crédito</SelectItem>
                    <SelectItem value="DEBITO">Débito</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Taxa do cartão (%)</Label>
              <Input type="number" min="0" max="20" step="0.01" placeholder="Ex: 2.5" {...register('taxaCartao', { valueAsNumber: true })} />
              <p className="text-xs text-muted-foreground">Taxa cobrada pela operadora</p>
            </div>
            <div className="space-y-1.5">
              <Label>Data da 1ª parcela *</Label>
              <Input type="date" {...register('dataInicio')} />
            </div>
          </div>

          {/* Preview */}
          {valorTotal > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Previsão de recebimentos</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor bruto:</span>
                <span>{formatBRL(valorTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa ({taxaCartao ?? 0}%):</span>
                <span className="text-red-500">- {formatBRL(valorTotal * (taxaCartao ?? 0) / 100)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Valor líquido:</span>
                <span className="text-emerald-600">{formatBRL(valorLiquido)}</span>
              </div>
              <div className="border-t pt-2 space-y-1">
                {Array.from({ length: Math.min(totalParcelas, 6) }, (_, i) => {
                  const dt = dataInicio ? addMonths(new Date(dataInicio), i) : new Date()
                  return (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Parcela {i + 1}/{totalParcelas} — {format(dt, 'MMM/yyyy', { locale: ptBR })}</span>
                      <span>{formatBRL(valorParcela)}</span>
                    </div>
                  )
                })}
                {totalParcelas > 6 && <p className="text-xs text-muted-foreground">... e mais {totalParcelas - 6} parcelas</p>}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Parcelamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
