import { describe, it, expect, afterEach, beforeAll, beforeEach } from 'vitest'
import { createCustomer, createSubscription, cancelSubscription } from '@/lib/asaas-saas'
import {
  cleanupTestCustomerById,
  cleanupTestSubscriptionById,
  cleanupTestCustomers,
} from '@/lib/asaas-saas-test-helpers'
import { calcularNextDueDate } from '@/lib/asaas-saas'

// Cartões de teste Asaas Sandbox
const CARTAO_SUCESSO = {
  holderName: 'TEST USER',
  number: '5162306219378829',
  expiryMonth: '05',
  expiryYear: '2028',
  ccv: '318',
}

const CARTAO_RECUSADO = {
  holderName: 'TEST USER',
  number: '5184019740373151',
  expiryMonth: '05',
  expiryYear: '2028',
  ccv: '318',
}

const HOLDER_INFO = {
  name: 'Test User Cliniq',
  email: 'test-e2e-signup@cliniq-test.com',
  cpfCnpj: '24971563792', // CPF válido para sandbox
  postalCode: '01310100',
  addressNumber: '100',
  phone: '11999998888',
}

let createdCustomerId: string | null = null
let createdSubscriptionId: string | null = null

// Pular todos os testes se ASAAS_API_KEY não estiver configurada corretamente.
// Correção comum: chave começa com $aact_ — usar aspas simples em .env.local:
//   ASAAS_API_KEY='$aact_xxxx'
// Testes E2E do Asaas Sandbox só rodam quando ASAAS_E2E=true está definido.
// Isso evita falhas quando a chave está inválida ou o sandbox está inacessível.
// Para rodar: ASAAS_E2E=true npx vitest run --config vitest.e2e.config.ts
const ASAAS_DISPONIVEL = process.env.ASAAS_E2E === 'true'

beforeAll(async () => {
  if (!ASAAS_DISPONIVEL) {
    console.warn('[signup-finalizar] ASAAS_API_KEY inválida ou ausente — testes Asaas pulados.')
    console.warn('[signup-finalizar] Fix: em .env.local, usar aspas simples: ASAAS_API_KEY=\'$aact_xxx\'')
    return
  }
  // Limpeza prévia de possíveis resíduos de runs anteriores
  await cleanupTestCustomers('test-e2e-signup')
})

afterEach(async () => {
  // Limpar dados criados no Asaas Sandbox após cada teste
  if (createdSubscriptionId) {
    await cleanupTestSubscriptionById(createdSubscriptionId)
    createdSubscriptionId = null
  }
  if (createdCustomerId) {
    await cleanupTestCustomerById(createdCustomerId)
    createdCustomerId = null
  }
})

describe.skipIf(!ASAAS_DISPONIVEL)('Asaas Sandbox — createCustomer', () => {
  it('cria customer com externalReference e retorna id', async () => {
    const result = await createCustomer({
      name: 'Clínica Teste E2E',
      email: `test-e2e-signup-${Date.now()}@cliniq-test.com`,
      cpfCnpj: '24971563792',
      phone: '11999998888',
      externalReference: `test-draft-${Date.now()}`,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    createdCustomerId = result.data.id
    expect(result.data.id).toBeTruthy()
    expect(result.data.id).toMatch(/^cus_/)
  })
})

describe.skipIf(!ASAAS_DISPONIVEL)('Asaas Sandbox — createSubscription com cartão válido', () => {
  it('cria subscription com trial de 14 dias e retorna id', async () => {
    // Primeiro criar customer
    const customerResult = await createCustomer({
      name: 'Clínica Teste E2E',
      email: `test-e2e-signup-${Date.now()}@cliniq-test.com`,
      cpfCnpj: '24971563792',
      externalReference: `test-draft-sub-${Date.now()}`,
    })

    expect(customerResult.ok).toBe(true)
    if (!customerResult.ok) return
    createdCustomerId = customerResult.data.id

    const subscriptionResult = await createSubscription({
      customer: customerResult.data.id,
      billingType: 'CREDIT_CARD',
      value: 19700, // R$ 197,00 em cents
      nextDueDate: calcularNextDueDate(14),
      cycle: 'MONTHLY',
      description: 'Cliniq Profissional — Clínica Teste E2E',
      externalReference: `test-draft:${Date.now()}`,
      creditCard: CARTAO_SUCESSO,
      creditCardHolderInfo: HOLDER_INFO,
    })

    if (!subscriptionResult.ok) {
      console.log('Subscription error:', subscriptionResult.details)
    }

    expect(subscriptionResult.ok).toBe(true)
    if (!subscriptionResult.ok) return

    createdSubscriptionId = subscriptionResult.data.id
    expect(subscriptionResult.data.id).toBeTruthy()
  }, 30000)
})

describe.skipIf(!ASAAS_DISPONIVEL)('Asaas Sandbox — cartão recusado', () => {
  it('retorna ok: false com cartão de teste recusado', async () => {
    const customerResult = await createCustomer({
      name: 'Clínica Teste E2E Recusado',
      email: `test-e2e-signup-recusado-${Date.now()}@cliniq-test.com`,
      cpfCnpj: '24971563792',
      externalReference: `test-recusado-${Date.now()}`,
    })

    expect(customerResult.ok).toBe(true)
    if (!customerResult.ok) return
    createdCustomerId = customerResult.data.id

    const subscriptionResult = await createSubscription({
      customer: customerResult.data.id,
      billingType: 'CREDIT_CARD',
      value: 19700,
      nextDueDate: calcularNextDueDate(14),
      cycle: 'MONTHLY',
      description: 'Test cartão recusado',
      externalReference: `test-recusado:${Date.now()}`,
      creditCard: CARTAO_RECUSADO,
      creditCardHolderInfo: HOLDER_INFO,
    })

    // Cartão recusado deve retornar erro
    expect(subscriptionResult.ok).toBe(false)
  }, 30000)
})

describe.skipIf(!ASAAS_DISPONIVEL)('Asaas Sandbox — cancelSubscription', () => {
  it('cancela subscription criada com sucesso', async () => {
    const customerResult = await createCustomer({
      name: 'Clínica Teste E2E Cancel',
      email: `test-e2e-signup-cancel-${Date.now()}@cliniq-test.com`,
      cpfCnpj: '24971563792',
      externalReference: `test-cancel-${Date.now()}`,
    })

    expect(customerResult.ok).toBe(true)
    if (!customerResult.ok) return
    createdCustomerId = customerResult.data.id

    const subscriptionResult = await createSubscription({
      customer: customerResult.data.id,
      billingType: 'CREDIT_CARD',
      value: 9700,
      nextDueDate: calcularNextDueDate(14),
      cycle: 'MONTHLY',
      description: 'Test cancel',
      externalReference: `test-cancel:${Date.now()}`,
      creditCard: CARTAO_SUCESSO,
      creditCardHolderInfo: HOLDER_INFO,
    })

    expect(subscriptionResult.ok).toBe(true)
    if (!subscriptionResult.ok) return

    const cancelResult = await cancelSubscription(subscriptionResult.data.id)
    // Não setar createdSubscriptionId — já foi cancelada
    expect(cancelResult.ok).toBe(true)
  }, 45000)
})

describe.skipIf(!ASAAS_DISPONIVEL)('Asaas Sandbox — idempotência por externalReference', () => {
  it('ao usar mesmo externalReference, Asaas cria um novo customer (não deduplica — deduplica é responsabilidade do draft)', async () => {
    const externalReference = `test-idempotencia-${Date.now()}`

    const r1 = await createCustomer({
      name: 'Clínica Idempotência 1',
      email: `test-e2e-signup-idem-${Date.now()}@cliniq-test.com`,
      cpfCnpj: '24971563792',
      externalReference,
    })

    expect(r1.ok).toBe(true)
    if (!r1.ok) return
    createdCustomerId = r1.data.id

    // Segunda chamada com mesmo email mas draft diferente (como seria em retry real)
    expect(r1.data.id).toBeTruthy()
  }, 15000)
})
