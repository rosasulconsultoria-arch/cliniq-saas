import crypto from 'crypto'
import { StatusTenant } from '@prisma/client'

const BASE_URL = process.env.ASAAS_API_URL ?? 'https://sandbox.asaas.com/api/v3'
const TIMEOUT_MS = 10_000

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface AsaasCustomer {
  id: string
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  externalReference?: string
}

export interface AsaasCreditCard {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
}

export interface AsaasCreditCardHolderInfo {
  name: string
  email: string
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  phone: string
}

export interface AsaasSubscription {
  id: string
  status: string
  value: number
  nextDueDate: string
  cycle: string
  description?: string
  externalReference?: string
}

export type AsaasResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: unknown }

// ─── Fetch wrapper ────────────────────────────────────────────────────────────

async function asaasFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<AsaasResult<T>> {
  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'asaas_config_error', details: 'ASAAS_API_KEY não configurada' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
        ...options.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const detail = (body as any)?.errors?.[0]?.description ?? res.statusText
      console.error(`[asaas-saas] ${options.method ?? 'GET'} ${path} → ${res.status}: ${detail}`)
      return { ok: false, error: 'asaas_error', details: { status: res.status, body } }
    }

    const data = await res.json() as T
    return { ok: true, data }
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      console.error(`[asaas-saas] timeout em ${path} após ${TIMEOUT_MS}ms`)
      return { ok: false, error: 'asaas_timeout', details: `${path} excedeu ${TIMEOUT_MS}ms` }
    }
    console.error(`[asaas-saas] erro em ${path}:`, err)
    return { ok: false, error: 'asaas_network_error', details: String(err) }
  }
}

// ─── Funções públicas ─────────────────────────────────────────────────────────

export async function createCustomer(data: {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
  externalReference: string
}): Promise<AsaasResult<AsaasCustomer>> {
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
      phone: data.phone?.replace(/\D/g, ''),
      externalReference: data.externalReference,
    }),
  })
}

export async function createSubscription(data: {
  customer: string
  billingType: 'CREDIT_CARD'
  value: number
  nextDueDate: string // ISO date YYYY-MM-DD
  cycle: 'MONTHLY' | 'YEARLY'
  description: string
  externalReference: string
  creditCard: AsaasCreditCard
  creditCardHolderInfo: AsaasCreditCardHolderInfo
}): Promise<AsaasResult<AsaasSubscription>> {
  return asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: data.customer,
      billingType: data.billingType,
      value: data.value / 100, // Asaas usa reais, não centavos
      nextDueDate: data.nextDueDate,
      cycle: data.cycle,
      description: data.description,
      externalReference: data.externalReference,
      creditCard: {
        holderName: data.creditCard.holderName,
        number: data.creditCard.number.replace(/\s/g, ''),
        expiryMonth: data.creditCard.expiryMonth,
        expiryYear: data.creditCard.expiryYear,
        ccv: data.creditCard.ccv,
      },
      creditCardHolderInfo: {
        name: data.creditCardHolderInfo.name,
        email: data.creditCardHolderInfo.email,
        cpfCnpj: data.creditCardHolderInfo.cpfCnpj.replace(/\D/g, ''),
        postalCode: data.creditCardHolderInfo.postalCode.replace(/\D/g, ''),
        addressNumber: data.creditCardHolderInfo.addressNumber,
        phone: data.creditCardHolderInfo.phone.replace(/\D/g, ''),
      },
    }),
  })
}

export async function getSubscription(
  subscriptionId: string
): Promise<AsaasResult<AsaasSubscription>> {
  return asaasFetch<AsaasSubscription>(`/subscriptions/${subscriptionId}`)
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<AsaasResult<{ deleted: boolean }>> {
  return asaasFetch<{ deleted: boolean }>(`/subscriptions/${subscriptionId}`, {
    method: 'DELETE',
  })
}

export async function deleteCustomer(
  customerId: string
): Promise<AsaasResult<{ deleted: boolean }>> {
  return asaasFetch<{ deleted: boolean }>(`/customers/${customerId}`, {
    method: 'DELETE',
  })
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return false
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const expectedBuf = Buffer.from(expected)
  const signatureBuf = Buffer.from(signature)
  // timingSafeEqual exige buffers de mesmo tamanho
  if (expectedBuf.length !== signatureBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, signatureBuf)
}

// ─── Mapeamento de erros ──────────────────────────────────────────────────────

export function traduzirErroAsaas(codigoOuMensagem: string): string {
  const mapeamento: Record<string, string> = {
    INVALID_NUMBER: 'Número do cartão inválido. Verifique e tente novamente.',
    INVALID_CVV: 'Código de segurança (CVV) inválido.',
    INVALID_EXPIRY: 'Data de validade inválida.',
    INSUFFICIENT_FUNDS: 'Cartão sem limite suficiente. Tente outro cartão.',
    CARD_DECLINED: 'Pagamento não autorizado pelo banco. Tente outro cartão.',
    BLOCKED_CARD: 'Cartão bloqueado pelo banco. Entre em contato com seu banco ou use outro cartão.',
    EXPIRED_CARD: 'Este cartão está expirado.',
    INVALID_HOLDER_NAME: 'Nome no cartão inválido.',
    INVALID_CPF: 'CPF do titular inválido.',
    // Códigos alternativos que o Asaas Sandbox pode retornar
    invalid_card_number: 'Número do cartão inválido. Verifique e tente novamente.',
    invalid_cvv: 'Código de segurança (CVV) inválido.',
    card_declined: 'Pagamento não autorizado pelo banco. Tente outro cartão.',
    insufficient_funds: 'Cartão sem limite suficiente. Tente outro cartão.',
  }

  return mapeamento[codigoOuMensagem] ?? 'Pagamento não autorizado. Verifique os dados do cartão ou tente outro.'
}

// ─── Mapeamento subscriptionStatus → StatusTenant ────────────────────────────

export type AsaasSubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED'

export function mapearStatusAsaas(subscriptionStatus: string): {
  statusTenant: StatusTenant
  avisoPagamento: boolean
} {
  switch (subscriptionStatus) {
    case 'TRIALING':
      return { statusTenant: StatusTenant.TRIAL, avisoPagamento: false }
    case 'ACTIVE':
      return { statusTenant: StatusTenant.ATIVO, avisoPagamento: false }
    case 'PAST_DUE':
      // Não bloquear imediatamente — apenas sinalizar aviso
      return { statusTenant: StatusTenant.ATIVO, avisoPagamento: true }
    case 'CANCELED':
    case 'EXPIRED':
      return { statusTenant: StatusTenant.CANCELADO, avisoPagamento: false }
    default:
      // Status desconhecido — manter atual, sem aviso
      return { statusTenant: StatusTenant.TRIAL, avisoPagamento: false }
  }
}

// ─── Helper: calcular trialEndsAt ────────────────────────────────────────────

export function calcularTrialEndsAt(diasTrial = 14): Date {
  const d = new Date()
  d.setDate(d.getDate() + diasTrial)
  return d
}

export function calcularNextDueDate(diasTrial = 14): string {
  const d = calcularTrialEndsAt(diasTrial)
  return d.toISOString().split('T')[0]
}
