'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { CheckCircle, XCircle, AlertCircle, Loader2, Send, MessageCircle, Receipt, CreditCard, RefreshCw, Copy } from 'lucide-react'
import { ASAAS_STATUS } from '@/lib/asaas'
import { atualizarStatusAgendamento } from '@/app/(dashboard)/agenda/actions'
import { reenviarConfirmacao } from '@/app/(dashboard)/agenda/notificacao-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmarSenhaDialog } from '@/components/confirmar-senha-dialog'
import { verificarSenha } from '@/app/(dashboard)/profissionais/[id]/parcelamentos/actions'
import type { AgendamentoDisplay } from '@/types/agenda'

interface Props {
  agendamento: AgendamentoDisplay | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
  userRole?: string
  userProfissionalId?: string
}

const STATUS_CONFIG: Record<string, { label: string; variant: string; className: string }> = {
  AGENDADO: { label: 'Agendado', variant: 'outline', className: 'border-blue-400 text-blue-600' },
  CONFIRMADO: { label: 'Confirmado', variant: 'outline', className: 'border-green-500 text-green-600' },
  REALIZADO: { label: 'Realizado', variant: 'secondary', className: '' },
  CANCELADO: { label: 'Cancelado', variant: 'destructive', className: '' },
  FALTOU: { label: 'Faltou', variant: 'outline', className: 'border-amber-400 text-amber-600' },
}

const FORMA_LABELS: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  TRANSFERENCIA: 'Transferência',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
}

export function AppointmentDetailsDialog({ agendamento, open, onClose, onSuccess, userRole, userProfissionalId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [cancelarOpen, setCancelarOpen] = useState(false)
  const [whatsLink, setWhatsLink] = useState<string | null>(null)
  const [asaasLoading, setAsaasLoading] = useState(false)
  const [asaasInvoiceUrl, setAsaasInvoiceUrl] = useState<string | null>(agendamento?.asaasInvoiceUrl ?? null)
  const [asaasStatus, setAsaasStatus] = useState<string | null>(agendamento?.asaasPaymentStatus ?? null)

  if (!agendamento) return null

  const inicio = parseISO(agendamento.dataHoraInicio)
  const fim = parseISO(agendamento.dataHoraFim)
  const duracao = Math.round((fim.getTime() - inicio.getTime()) / 60_000)
  const cfg = STATUS_CONFIG[agendamento.status] ?? STATUS_CONFIG.AGENDADO
  const podeAlterar = !['CANCELADO', 'REALIZADO'].includes(agendamento.status)
  const ehDono = userRole === 'ADMIN' || !userProfissionalId || agendamento.profissional.id === userProfissionalId

  const temEmail = !!agendamento.paciente.email
  const temWhats = !!agendamento.paciente.telefone

  function handleStatus(status: 'CONFIRMADO' | 'REALIZADO' | 'FALTOU') {
    startTransition(async () => {
      const result = await atualizarStatusAgendamento(agendamento!.id, status)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Status atualizado!')
      onClose(); onSuccess()
    })
  }

  function handleReenviar() {
    startTransition(async () => {
      const result = await reenviarConfirmacao(agendamento!.id)
      if (result?.error) { toast.error(result.error); return }
      if (result.whatsappLink) setWhatsLink(result.whatsappLink)
      if (temEmail) toast.success('Confirmação enviada por email!')
      else toast.info('Paciente sem email — use o WhatsApp abaixo.')
    })
  }

  async function handleGerarCobranca() {
    setAsaasLoading(true)
    try {
      const res = await fetch('/api/asaas/cobranca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendamentoId: agendamento!.id }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao gerar cobrança'); return }
      setAsaasInvoiceUrl(json.invoiceUrl)
      setAsaasStatus(json.status)
      toast.success('Cobrança gerada! Link pronto para enviar.')
    } catch {
      toast.error('Erro ao conectar com o Asaas')
    } finally {
      setAsaasLoading(false)
    }
  }

  async function handleAtualizarStatus() {
    setAsaasLoading(true)
    try {
      const res = await fetch(`/api/asaas/cobranca?id=${agendamento!.id}`)
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erro ao buscar status'); return }
      setAsaasStatus(json.status)
    } catch {
      toast.error('Erro ao conectar com o Asaas')
    } finally {
      setAsaasLoading(false)
    }
  }

  const formaPag = agendamento.formaPagamento ? FORMA_LABELS[agendamento.formaPagamento] ?? agendamento.formaPagamento : null
  const detalhePag = formaPag
    ? `${formaPag}${agendamento.bandeiraCartao ? ` · ${agendamento.bandeiraCartao}` : ''}${agendamento.numeroParcelas && agendamento.numeroParcelas > 1 ? ` · ${agendamento.numeroParcelas}x` : ''}`
    : null

  return (
    <>
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

              {agendamento.tipoCobranca === 'PACOTE' && agendamento.totalSessoes && (
                <>
                  <span className="text-muted-foreground">Tipo</span>
                  <span>Pacote {agendamento.totalSessoes} sessões</span>
                </>
              )}

              <span className="text-muted-foreground">Valor</span>
              <span className="font-semibold text-emerald-600">R$ {agendamento.valor.toFixed(2).replace('.', ',')}</span>

              {detalhePag && (
                <>
                  <span className="text-muted-foreground">Pagamento</span>
                  <span>{detalhePag}</span>
                </>
              )}
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

            {/* Recibo */}
            <Separator />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={async () => {
                try {
                  const { downloadReciboPDF } = await import('@/lib/pdf-client')
                  await downloadReciboPDF(agendamento.id)
                } catch (e) {
                  console.error(e)
                  window.open(`/api/recibo?id=${agendamento.id}`, '_blank')
                }
              }}
            >
              <Receipt className="h-4 w-4 mr-1.5" />
              Baixar Recibo PDF
            </Button>

            {/* Asaas */}
            {agendamento.profissional.temAsaas && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cobrança Asaas</p>
                  {asaasInvoiceUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {asaasStatus && ASAAS_STATUS[asaasStatus] && (
                          <span className={`text-xs font-medium ${ASAAS_STATUS[asaasStatus].color}`}>
                            {ASAAS_STATUS[asaasStatus].label}
                          </span>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={handleAtualizarStatus}
                          disabled={asaasLoading}
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${asaasLoading ? 'animate-spin' : ''}`} />
                          Atualizar
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline" size="sm"
                          className="flex-1 text-xs"
                          onClick={() => { navigator.clipboard.writeText(asaasInvoiceUrl); toast.success('Link copiado!') }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />
                          Copiar link de pagamento
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={asaasInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs">Abrir</a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline" size="sm"
                      className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      onClick={handleGerarCobranca}
                      disabled={asaasLoading}
                    >
                      {asaasLoading
                        ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        : <CreditCard className="h-4 w-4 mr-1.5" />}
                      Gerar cobrança Asaas
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Notificações */}
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notificações</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline" size="sm"
                  onClick={handleReenviar}
                  disabled={isPending}
                  title={temEmail ? 'Reenviar por email' : 'Paciente sem email'}
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  {agendamento.confirmacaoEnviada ? 'Reenviar Email' : 'Enviar Confirmação'}
                  {!temEmail && <span className="ml-1 text-muted-foreground">(sem email)</span>}
                </Button>

                {(temWhats || whatsLink) && (
                  <Button variant="outline" size="sm" className="text-green-600 border-green-300 hover:bg-green-50" asChild>
                    <a
                      href={whatsLink ?? `https://wa.me/55${agendamento.paciente.telefone?.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>
              {agendamento.confirmacaoEnviada && (
                <p className="text-xs text-emerald-600">✓ Confirmação já enviada</p>
              )}
            </div>

            {podeAlterar && ehDono && (
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
                    <Button variant="outline" size="sm" onClick={() => setCancelarOpen(true)} disabled={isPending} className="text-red-600 border-red-300 hover:bg-red-50">
                      <XCircle className="h-4 w-4 mr-1.5" /> Cancelar
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmarSenhaDialog
        open={cancelarOpen}
        onClose={() => setCancelarOpen(false)}
        titulo="Cancelar Agendamento"
        descricao="O agendamento será cancelado. Digite sua senha para confirmar."
        labelConfirmar="Cancelar Agendamento"
        onConfirm={async (senha) => {
          const ok = await verificarSenha(senha)
          if (!ok) return { error: 'Senha incorreta' }
          const result = await atualizarStatusAgendamento(agendamento.id, 'CANCELADO')
          if (!result?.error) { setCancelarOpen(false); onClose(); onSuccess() }
          return result ?? {}
        }}
      />
    </>
  )
}
