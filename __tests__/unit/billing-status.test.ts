import { describe, it, expect } from 'vitest'
import { classificarAcessoTenant } from '@/lib/billing/status'

const agora = new Date()
const diasParaFuturo = (dias: number) => new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000)
const diasParaPassado = (dias: number) => new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000)

describe('classificarAcessoTenant', () => {
  it('tenant TRIAL com trialEndsAt > now retorna ALLOWED', () => {
    const result = classificarAcessoTenant({
      status: 'TRIAL',
      trialEndsAt: diasParaFuturo(10),
      subscriptionStatus: null,
      avisoPagamento: false,
      avisoPagamentoDesde: null,
    })
    expect(result.level).toBe('ALLOWED')
  })

  it('tenant TRIAL com trialEndsAt < now e subscriptionStatus != ACTIVE retorna BLOCKED', () => {
    const result = classificarAcessoTenant({
      status: 'TRIAL',
      trialEndsAt: diasParaPassado(1),
      subscriptionStatus: 'TRIALING',
      avisoPagamento: false,
      avisoPagamentoDesde: null,
    })
    expect(result.level).toBe('BLOCKED')
    expect(result.reason).toBe('trial_expired')
  })

  it('tenant TRIAL com trialEndsAt < now e subscriptionStatus = ACTIVE retorna ALLOWED', () => {
    const result = classificarAcessoTenant({
      status: 'TRIAL',
      trialEndsAt: diasParaPassado(1),
      subscriptionStatus: 'ACTIVE',
      avisoPagamento: false,
      avisoPagamentoDesde: null,
    })
    expect(result.level).toBe('ALLOWED')
  })

  it('tenant TRIAL com 7 dias restantes retorna WARNING', () => {
    const result = classificarAcessoTenant({
      status: 'TRIAL',
      trialEndsAt: diasParaFuturo(7),
      subscriptionStatus: null,
      avisoPagamento: false,
      avisoPagamentoDesde: null,
    })
    expect(result.level).toBe('WARNING')
    expect(result.diasRestantes).toBe(7)
  })

  it('tenant TRIAL com 1 dia restante retorna WARNING urgente', () => {
    const result = classificarAcessoTenant({
      status: 'TRIAL',
      trialEndsAt: diasParaFuturo(1),
      subscriptionStatus: null,
      avisoPagamento: false,
      avisoPagamentoDesde: null,
    })
    expect(result.level).toBe('WARNING')
    expect(result.diasRestantes).toBe(1)
  })

  it('subscriptionStatus CANCELED retorna BLOCKED', () => {
    const result = classificarAcessoTenant({
      status: 'ATIVO',
      trialEndsAt: null,
      subscriptionStatus: 'CANCELED',
      avisoPagamento: false,
      avisoPagamentoDesde: null,
    })
    expect(result.level).toBe('BLOCKED')
    expect(result.reason).toBe('subscription_canceled')
  })

  it('subscriptionStatus PAST_DUE há 8 dias retorna BLOCKED (grace expirou)', () => {
    const result = classificarAcessoTenant({
      status: 'ATIVO',
      trialEndsAt: null,
      subscriptionStatus: 'PAST_DUE',
      avisoPagamento: true,
      avisoPagamentoDesde: diasParaPassado(8),
    })
    expect(result.level).toBe('BLOCKED')
    expect(result.reason).toBe('payment_overdue_grace_expired')
  })

  it('subscriptionStatus PAST_DUE há 3 dias retorna WARNING (dentro do grace)', () => {
    const result = classificarAcessoTenant({
      status: 'ATIVO',
      trialEndsAt: null,
      subscriptionStatus: 'PAST_DUE',
      avisoPagamento: true,
      avisoPagamentoDesde: diasParaPassado(3),
    })
    expect(result.level).toBe('WARNING')
    expect(result.avisoPagamento).toBe(true)
  })
})
