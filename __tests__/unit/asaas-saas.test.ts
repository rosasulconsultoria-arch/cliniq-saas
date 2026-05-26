import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCustomer,
  createSubscription,
  cancelSubscription,
  validateWebhookSignature,
  calcularNextDueDate,
  calcularTrialEndsAt,
  traduzirErroAsaas,
  mapearStatusAsaas,
} from '@/lib/asaas-saas'
import { StatusTenant } from '@prisma/client'
import crypto from 'crypto'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function mockOk(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  })
}

function mockError(status: number, body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Error',
    json: async () => body,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('ASAAS_API_KEY', 'test_key')
  vi.stubEnv('ASAAS_API_URL', 'https://sandbox.asaas.com/api/v3')
})

describe('createCustomer', () => {
  it('formata payload corretamente — remove máscara do CPF', async () => {
    mockOk({ id: 'cus_abc', name: 'João', email: 'joao@test.com', cpfCnpj: '12345678901' })

    await createCustomer({
      name: 'João Silva',
      email: 'joao@test.com',
      cpfCnpj: '123.456.789-01',
      phone: '(11) 99999-8888',
      externalReference: 'draft_123',
    })

    const [, opts] = mockFetch.mock.calls[0]
    const body = JSON.parse(opts.body)

    expect(body.cpfCnpj).toBe('12345678901')
    expect(body.phone).toBe('11999998888')
    expect(body.externalReference).toBe('draft_123')
  })

  it('retorna ok: false em erro da API', async () => {
    mockError(400, { errors: [{ description: 'Invalid CPF' }] })

    const result = await createCustomer({
      name: 'Test',
      email: 'x@test.com',
      cpfCnpj: '000',
      externalReference: 'ref',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('asaas_error')
  })
})

describe('createSubscription', () => {
  it('calcula nextDueDate = hoje + 14 dias corretamente', () => {
    const hoje = new Date()
    const em14Dias = new Date()
    em14Dias.setDate(hoje.getDate() + 14)
    const esperado = em14Dias.toISOString().split('T')[0]

    expect(calcularNextDueDate(14)).toBe(esperado)
  })

  it('converte cents para reais no payload (value = cents / 100)', async () => {
    mockOk({ id: 'sub_abc', status: 'ACTIVE', value: 197 })

    await createSubscription({
      customer: 'cus_abc',
      billingType: 'CREDIT_CARD',
      value: 19700, // 197 reais em cents
      nextDueDate: '2026-06-09',
      cycle: 'MONTHLY',
      description: 'Plano Profissional',
      externalReference: 'draft:123',
      creditCard: { holderName: 'JOAO SILVA', number: '5162306219378829', expiryMonth: '05', expiryYear: '2028', ccv: '318' },
      creditCardHolderInfo: { name: 'João Silva', email: 'joao@test.com', cpfCnpj: '12345678901', postalCode: '01310100', addressNumber: '100', phone: '11999998888' },
    })

    const [, opts] = mockFetch.mock.calls[0]
    const body = JSON.parse(opts.body)

    expect(body.value).toBe(197) // reais, não cents
  })
})

describe('cancelSubscription', () => {
  it('chama DELETE no endpoint correto', async () => {
    mockOk({ deleted: true })

    await cancelSubscription('sub_xyz')

    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toContain('/subscriptions/sub_xyz')
    expect(opts.method).toBe('DELETE')
  })
})

describe('validateWebhookSignature', () => {
  it('valida HMAC-SHA256 corretamente', () => {
    const secret = 'meu_secret'
    const payload = JSON.stringify({ event: 'PAYMENT_CONFIRMED' })
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    expect(validateWebhookSignature(payload, signature, secret)).toBe(true)
  })

  it('rejeita assinatura inválida', () => {
    expect(validateWebhookSignature('payload', 'assinatura_errada', 'secret')).toBe(false)
  })

  it('retorna false quando secret está vazio', () => {
    expect(validateWebhookSignature('payload', 'qualquer', '')).toBe(false)
  })
})

describe('traduzirErroAsaas', () => {
  it('mapeia CARD_DECLINED para mensagem em português', () => {
    const msg = traduzirErroAsaas('CARD_DECLINED')
    expect(msg).toContain('Pagamento não autorizado')
  })

  it('retorna fallback genérico para código desconhecido', () => {
    const msg = traduzirErroAsaas('CODIGO_DESCONHECIDO_XYZ')
    expect(msg).toContain('Verifique os dados do cartão')
  })
})

describe('mapearStatusAsaas', () => {
  it('ACTIVE → StatusTenant.ATIVO, sem aviso', () => {
    const r = mapearStatusAsaas('ACTIVE')
    expect(r.statusTenant).toBe(StatusTenant.ATIVO)
    expect(r.avisoPagamento).toBe(false)
  })

  it('PAST_DUE → mantém ATIVO mas ativa avisoPagamento', () => {
    const r = mapearStatusAsaas('PAST_DUE')
    expect(r.statusTenant).toBe(StatusTenant.ATIVO)
    expect(r.avisoPagamento).toBe(true)
  })

  it('CANCELED → StatusTenant.CANCELADO', () => {
    const r = mapearStatusAsaas('CANCELED')
    expect(r.statusTenant).toBe(StatusTenant.CANCELADO)
  })

  it('EXPIRED → StatusTenant.CANCELADO', () => {
    const r = mapearStatusAsaas('EXPIRED')
    expect(r.statusTenant).toBe(StatusTenant.CANCELADO)
  })
})

describe('fetch wrapper timeout', () => {
  it('retorna ok: false em timeout', async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error('AbortError'), { name: 'AbortError' })), 0)
      )
    )

    const result = await createCustomer({
      name: 'Test',
      email: 'x@test.com',
      cpfCnpj: '12345678901',
      externalReference: 'ref',
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe('asaas_timeout')
  })
})
