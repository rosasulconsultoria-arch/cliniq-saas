import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { validateWebhookSignature, mapearStatusAsaas } from '@/lib/asaas-saas'
import { StatusTenant } from '@prisma/client'

// Sempre retornar 200 — Asaas tenta reenviar indefinidamente em caso de falha
const OK = () => NextResponse.json({ received: true }, { status: 200 })

export async function POST(req: NextRequest): Promise<NextResponse> {
  const payload = await req.text()
  const secret = process.env.ASAAS_WEBHOOK_SECRET ?? ''

  // Validar assinatura apenas se o secret estiver configurado
  if (secret) {
    const signature = req.headers.get('asaas-signature') ?? ''
    if (!validateWebhookSignature(payload, signature, secret)) {
      console.warn('[saas-webhook] assinatura inválida — rejeitando request')
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
    }
  } else {
    console.warn('[saas-webhook] ASAAS_WEBHOOK_SECRET não configurado — aceitando sem validação')
  }

  let evento: Record<string, unknown>
  try {
    evento = JSON.parse(payload)
  } catch {
    console.error('[saas-webhook] payload inválido — não é JSON')
    return OK()
  }

  const event = evento.event as string | undefined
  const payment = evento.payment as Record<string, unknown> | undefined
  const subscription = evento.subscription as Record<string, unknown> | undefined

  console.log(`[saas-webhook] evento recebido: ${event}`)

  try {
    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        // Primeira cobrança paga → sair do trial, marcar ATIVO
        const subscriptionId =
          (payment?.subscription as string | undefined) ??
          (payment?.externalReference as string | undefined)

        const externalRef = payment?.externalReference as string | undefined

        await atualizarTenantPorSubscription(subscriptionId, externalRef, {
          subscriptionStatus: 'ACTIVE',
          status: StatusTenant.ATIVO,
          avisoPagamento: false,
          avisoPagamentoDesde: 'CLEAR',
        })
        break
      }

      case 'PAYMENT_OVERDUE': {
        // Cobrança vencida → aviso, mas NÃO bloquear imediatamente
        // avisoPagamentoDesde só é setado na primeira ocorrência — preserva o timestamp original
        const subscriptionId = payment?.subscription as string | undefined
        const externalRef = payment?.externalReference as string | undefined

        await atualizarTenantPorSubscription(subscriptionId, externalRef, {
          avisoPagamento: true,
          avisoPagamentoDesde: 'SET_IF_NULL',
        })
        break
      }

      case 'PAYMENT_DELETED': {
        // Cobrança removida — sem ação de bloqueio
        break
      }

      case 'SUBSCRIPTION_CANCELED':
      case 'SUBSCRIPTION_DELETED': {
        const subscriptionId =
          (subscription?.id as string | undefined) ??
          (subscription?.externalReference as string | undefined)

        const externalRef = subscription?.externalReference as string | undefined

        await atualizarTenantPorSubscription(subscriptionId, externalRef, {
          subscriptionStatus: 'CANCELED',
          status: StatusTenant.CANCELADO,
          avisoPagamento: false,
        })
        break
      }

      default:
        console.log(`[saas-webhook] evento ignorado: ${event}`)
    }
  } catch (err) {
    console.error('[saas-webhook] erro ao processar evento:', err)
  }

  return OK()
}

async function atualizarTenantPorSubscription(
  asaasSubscriptionId: string | undefined,
  externalReference: string | undefined,
  campos: Partial<{
    subscriptionStatus: string
    status: StatusTenant
    avisoPagamento: boolean
    avisoPagamentoDesde: 'SET_IF_NULL' | 'CLEAR'
  }>
): Promise<void> {
  let tenant = null

  if (asaasSubscriptionId) {
    tenant = await db.tenant.findUnique({ where: { asaasSubscriptionId } })
  }

  if (!tenant && externalReference) {
    tenant = await db.tenant.findFirst({
      where: { asaasSubscriptionId: externalReference },
    })
  }

  if (!tenant) {
    console.warn(
      `[saas-webhook] tenant não encontrado — subscriptionId: ${asaasSubscriptionId}, ref: ${externalReference}`
    )
    return
  }

  const { avisoPagamentoDesde, ...camposRestantes } = campos

  const data: Record<string, unknown> = { ...camposRestantes }

  if (avisoPagamentoDesde === 'SET_IF_NULL' && !tenant.avisoPagamentoDesde) {
    data.avisoPagamentoDesde = new Date()
  } else if (avisoPagamentoDesde === 'CLEAR') {
    data.avisoPagamentoDesde = null
  }

  await db.tenant.update({
    where: { id: tenant.id },
    data,
  })

  // Invalida o cache do middleware para que a mudança de status reflita imediatamente
  revalidateTag('tenants')

  console.log(`[saas-webhook] tenant ${tenant.slug} atualizado:`, data)
}
