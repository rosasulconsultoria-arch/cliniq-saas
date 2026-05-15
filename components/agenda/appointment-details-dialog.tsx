'use client'

import { useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, Clock, Loader2 } from 'lucide-react'
import { atualizarStatusAgendamento, deletarAgendamento } from '@/app/(dashboard)/agenda/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AgendamentoDisplay } from '@/types/agenda'

interface Props {
  agendamento: AgendamentoDisplay | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const STATUS_CONFIG: Record<string, { label: string; variant: string; className: string }> = {
  AGENDADO: { label: 'Agendado', variant: 'outline', className: 'border-blue-400 text-blue-600' },
  CONFIRMADO: { label: 'Confirmado', variant: 'outline', className: 'border-green-500 text-green-600' },
  REALIZADO: { label: 'Realizado', variant: 'secondary', className: '' },
  CANCELADO: { label: 'Cancelado', variant: 'destructive', className: '' },
  FALTOU: { label: 'Faltou', variant: 'outline', className: 'border-amber-400 text-amber-600' },
}

export function AppointmentDetailsDialog({ agendamento, open, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()

  if (!agendamento) return null

  const inicio = parseISO(agendamento.dataHoraInicio)
  const fim = parseISO(agendamento.dataHoraFim)
  const duracao = Math.round((fim.getTime() - inicio.getTime()) / 60_000)
  const cfg = STATUS_CONFIG[agendamento.status] ?? STATUS_CONFIG.AGENDADO

  function handleStatus(status: 'CONFIRMADO' | 'REALIZADO' | 'CANCELADO' | 'FALTOU') {
    startTransition(async () => {
      const result = await atualizarStatusAgendamento(agendamento!.id, status)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Status atualizado!')
      onClose()
      onSuccess()
    })
  }

  const podeAlterar = !['CANCELADO', 'REALIZADO'].includes(agendamento.status)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Agendamento
            <Badge variant={cfg.variant as any} className={cfg.className}>{cfg.label}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-muted-foreground">Paciente</span>
            <span className="font-medium">{agendamento.paciente.nome}</span>

            <span className="text-muted-foreground">Profissional</span>
            <span>{agendamento.profissional.nome}</span>

            <span className="text-muted-foreground">Sala</span>
            <span>{agendamento.sala.nome}</span>

            <span className="text-muted-foreground">Data</span>
            <span>{format(inicio, "dd/MM/yyyy", { locale: ptBR })}</span>

            <span className="text-muted-foreground">Horário</span>
            <span>{format(inicio, 'HH:mm')} — {format(fim, 'HH:mm')} ({duracao} min)</span>

            <span className="text-muted-foreground">Valor</span>
            <span>R$ {agendamento.valor.toFixed(2).replace('.', ',')}</span>
          </div>

          {agendamento.observacoes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{agendamento.observacoes}</p>
              </div>
            </>
          )}

          {podeAlterar && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alterar status</p>
                <div className="grid grid-cols-2 gap-2">
                  {agendamento.status !== 'CONFIRMADO' && (
                    <Button variant="outline" size="sm" onClick={() => handleStatus('CONFIRMADO')} disabled={isPending} className="text-green-600 border-green-300 hover:bg-green-50">
                      <CheckCircle className="h-4 w-4 mr-1.5" /> Confirmar
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleStatus('REALIZADO')} disabled={isPending} className="text-slate-600">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                    Realizado
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleStatus('FALTOU')} disabled={isPending} className="text-amber-600 border-amber-300 hover:bg-amber-50">
                    <AlertCircle className="h-4 w-4 mr-1.5" /> Faltou
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleStatus('CANCELADO')} disabled={isPending} className="text-red-600 border-red-300 hover:bg-red-50">
                    <XCircle className="h-4 w-4 mr-1.5" /> Cancelar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
