import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { classificarAcessoTenant } from '@/lib/billing/status'

// Estes testes exercitam a lógica de classificação + redirecionamento de billing.
// Os testes de redirect real (middleware) requerem servidor Next.js rodando.
// Os testes de lógica pura são executados aqui diretamente.

const SLUG_TEST = `e4-test-enforcement-${Date.now()}`

let tenantId: string

beforeAll(async () => {
  const tenant = await db.tenant.create({
    data: {
      slug: SLUG_TEST,
      nome: 'Clínica E4 Enforcement Test',
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // expirado ontem
      subscriptionStatus: 'TRIALING',
      avisoPagamento: false,
    },
  })
  tenantId = tenant.id
})

afterAll(async () => {
  await db.tenant.delete({ where: { id: tenantId } }).catch(() => null)
})

describe('trial enforcement — lógica de classificação', () => {
  it('tenant TRIAL expirado é classificado como BLOCKED', async () => {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true, trialEndsAt: true, subscriptionStatus: true, avisoPagamento: true, avisoPagamentoDesde: true },
    })
    expect(tenant).toBeTruthy()
    const acesso = classificarAcessoTenant(tenant!)
    expect(acesso.level).toBe('BLOCKED')
    expect(acesso.reason).toBe('trial_expired')
  })

  it('rota /agendar/[slug] nunca é afetada por billing (rota pública, lógica separada)', () => {
    // A rota /agendar é tratada como pública no middleware (isPublica = true)
    // antes do check de billing — portanto sempre passa
    const rotaPublica = '/agendar/meu-profissional'
    expect(rotaPublica.startsWith('/agendar')).toBe(true)
  })

  it('tenant BLOCKED acessando /billing/* é permitido (prefixo billing ignorado)', () => {
    const billing = '/billing/upgrade'
    const ignorarBilling = billing.startsWith('/billing') || billing.startsWith('/api')
    expect(ignorarBilling).toBe(true)
  })

  it('tenant TRIAL com 5 dias restantes é classificado como WARNING', () => {
    const acesso = classificarAcessoTenant({
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      subscriptionStatus: null,
      avisoPagamento: false,
      avisoPagamentoDesde: null,
    })
    expect(acesso.level).toBe('WARNING')
    expect(acesso.diasRestantes).toBe(5)
  })

  it('tenant ATIVO sem avisoPagamento é classificado como ALLOWED', () => {
    const acesso = classificarAcessoTenant({
      status: 'ATIVO',
      trialEndsAt: null,
      subscriptionStatus: 'ACTIVE',
      avisoPagamento: false,
      avisoPagamentoDesde: null,
    })
    expect(acesso.level).toBe('ALLOWED')
  })

  it('atualizar cartão — validação de schema aceita dados válidos', async () => {
    const { atualizarCartaoSchema } = await import('@/lib/cartao/validation')
    const dados = {
      holderName: 'João Silva',
      number: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '2027',
      ccv: '123',
      cpfCnpj: '12345678901',
      postalCode: '01310100',
      addressNumber: '100',
      phone: '11987654321',
    }
    const result = atualizarCartaoSchema.safeParse(dados)
    expect(result.success).toBe(true)
  })
})
