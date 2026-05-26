export type AccessLevel = 'ALLOWED' | 'WARNING' | 'BLOCKED'

export type BloqueioReason =
  | 'trial_expired'
  | 'subscription_canceled'
  | 'payment_overdue_grace_expired'

export interface AcessoTenant {
  level: AccessLevel
  reason?: BloqueioReason
  diasRestantes?: number
  avisoPagamento?: boolean
}

interface TenantBillingFields {
  status: string
  trialEndsAt?: Date | null
  subscriptionStatus?: string | null
  avisoPagamento: boolean
  avisoPagamentoDesde?: Date | null
}

function calcularDiasOverdue(avisoPagamentoDesde: Date): number {
  const agora = new Date()
  return Math.floor((agora.getTime() - avisoPagamentoDesde.getTime()) / (1000 * 60 * 60 * 24))
}

export function classificarAcessoTenant(tenant: TenantBillingFields): AcessoTenant {
  const agora = new Date()
  const { status, trialEndsAt, subscriptionStatus, avisoPagamento, avisoPagamentoDesde } = tenant

  // BLOQUEADO: trial expirado e subscription não ACTIVE
  if (status === 'TRIAL' && trialEndsAt && trialEndsAt < agora && subscriptionStatus !== 'ACTIVE') {
    return { level: 'BLOCKED', reason: 'trial_expired' }
  }

  // BLOQUEADO: subscription cancelada ou expirada
  if (subscriptionStatus === 'CANCELED' || subscriptionStatus === 'EXPIRED') {
    return { level: 'BLOCKED', reason: 'subscription_canceled' }
  }

  // BLOQUEADO: PAST_DUE há mais de 7 dias (grace period expirado)
  if (subscriptionStatus === 'PAST_DUE' && avisoPagamento && avisoPagamentoDesde) {
    const diasOverdue = calcularDiasOverdue(avisoPagamentoDesde)
    if (diasOverdue > 7) {
      return { level: 'BLOCKED', reason: 'payment_overdue_grace_expired' }
    }
  }

  // WARNING: trial nos últimos 7 dias
  if (status === 'TRIAL' && trialEndsAt) {
    const diasRestantes = Math.ceil((trialEndsAt.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
    if (diasRestantes <= 7 && diasRestantes >= 0) {
      return { level: 'WARNING', diasRestantes }
    }
  }

  // WARNING: PAST_DUE dentro do grace period
  if (subscriptionStatus === 'PAST_DUE' && avisoPagamento) {
    return { level: 'WARNING', avisoPagamento: true }
  }

  return { level: 'ALLOWED' }
}
