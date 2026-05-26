import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CreditCard, RefreshCcw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getStatusBilling } from './actions'
import { BillingCancelDialog } from './_CancelDialog'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  TRIAL:     { label: 'Trial',      variant: 'secondary' },
  ATIVO:     { label: 'Ativo',      variant: 'default' },
  CANCELADO: { label: 'Cancelado',  variant: 'destructive' },
  BLOQUEADO: { label: 'Bloqueado',  variant: 'destructive' },
}

const SUB_STATUS_LABELS: Record<string, string> = {
  TRIALING:  'Trial ativo',
  ACTIVE:    'Ativo',
  PAST_DUE:  'Pagamento pendente',
  CANCELED:  'Cancelado',
  EXPIRED:   'Expirado',
}

export default async function BillingPage() {
  const billing = await getStatusBilling()

  if (!billing) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Não foi possível carregar informações de assinatura.</p>
      </div>
    )
  }

  const statusInfo = STATUS_LABELS[billing.status] ?? { label: billing.status, variant: 'outline' as const }
  const valorFormatado = `R$ ${(billing.valorCents / 100).toFixed(2).replace('.', ',')}`
  const periodLabel = billing.periodicidade === 'ANUAL' ? 'ano' : 'mês'

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Assinatura</h1>

      {/* Plano */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg">Plano {billing.nomePlano}</p>
            <p className="text-muted-foreground text-sm">
              {valorFormatado}/{periodLabel}
            </p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>

        <div className="text-sm space-y-1 text-muted-foreground">
          {billing.subscriptionStatus && (
            <p>Assinatura: {SUB_STATUS_LABELS[billing.subscriptionStatus] ?? billing.subscriptionStatus}</p>
          )}
          {billing.status === 'TRIAL' && billing.trialEndsAt && (
            <p>
              Trial até{' '}
              <span className="font-medium text-foreground">
                {format(new Date(billing.trialEndsAt), "dd/MMM/yyyy", { locale: ptBR })}
              </span>
            </p>
          )}
          {billing.proximaCobrancaData && (
            <p>
              Próxima cobrança:{' '}
              <span className="font-medium text-foreground">
                {format(new Date(billing.proximaCobrancaData), "dd/MMM/yyyy", { locale: ptBR })}
                {billing.proximaCobrancaValor != null && (
                  <> — R$ {billing.proximaCobrancaValor.toFixed(2).replace('.', ',')}</>
                )}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Forma de pagamento */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Forma de pagamento</p>
              <p className="text-muted-foreground text-sm">
                {billing.cartaoFinal ? `Cartão final ****${billing.cartaoFinal}` : 'Nenhum cartão cadastrado'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/billing/atualizar-cartao">Atualizar cartão</Link>
          </Button>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled className="gap-2">
          <RefreshCcw className="h-4 w-4" />
          Mudar de plano
          {/* TODO: implementar /billing/mudar-plano */}
        </Button>

        {billing.status !== 'CANCELADO' && (
          <BillingCancelDialog />
        )}
      </div>
    </div>
  )
}
