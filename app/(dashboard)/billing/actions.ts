'use server'

import { revalidatePath } from 'next/cache'
import { withTenantAction } from '@/lib/with-tenant-action'
import { getTenantId } from '@/lib/tenant-context'
import { db } from '@/lib/db'
import { PLANOS, type PlanoId } from '@/lib/plans'
import {
  getSubscription,
  cancelSubscription,
  restoreSubscription,
  updateSubscriptionCreditCard,
  traduzirErroAsaas,
  type AsaasCreditCard,
  type AsaasCreditCardHolderInfo,
} from '@/lib/asaas-saas'
import { atualizarCartaoSchema, type AtualizarCartaoInput } from '@/lib/cartao/validation'

export interface StatusBilling {
  nomePlano: string
  periodicidade: 'MENSAL' | 'ANUAL'
  valorCents: number
  status: string
  subscriptionStatus: string | null
  trialEndsAt: string | null
  proximaCobrancaData: string | null
  proximaCobrancaValor: number | null
  cartaoFinal: string | null  // ex: "1234"
}

export async function getStatusBilling(): Promise<StatusBilling | null> {
  return withTenantAction(async () => {
    const tenantId = getTenantId()
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plano: true,
        periodicidade: true,
        status: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        asaasSubscriptionId: true,
      },
    })
    if (!tenant) return null

    const planoInfo = PLANOS[tenant.plano as PlanoId]
    const cents = tenant.periodicidade === 'ANUAL'
      ? planoInfo.precos.anual.cents
      : planoInfo.precos.mensal.cents

    let proximaCobrancaData: string | null = null
    let proximaCobrancaValor: number | null = null
    let cartaoFinal: string | null = null

    if (tenant.asaasSubscriptionId) {
      const result = await getSubscription(tenant.asaasSubscriptionId)
      if (result.ok) {
        proximaCobrancaData = result.data.nextDueDate ?? null
        proximaCobrancaValor = result.data.value ?? null
        if (result.data.creditCardNumber) {
          const parts = result.data.creditCardNumber.replace(/\s/g, '')
          cartaoFinal = parts.slice(-4) || null
        }
      }
    }

    return {
      nomePlano: planoInfo.nome,
      periodicidade: tenant.periodicidade,
      valorCents: cents,
      status: tenant.status,
      subscriptionStatus: tenant.subscriptionStatus,
      trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
      proximaCobrancaData,
      proximaCobrancaValor,
      cartaoFinal,
    }
  })
}

export async function atualizarCartao(
  dados: AtualizarCartaoInput
): Promise<{ success: boolean; error?: string }> {
  return withTenantAction(async () => {
    const parsed = atualizarCartaoSchema.safeParse(dados)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
    }

    const tenantId = getTenantId()
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { asaasSubscriptionId: true, users: { take: 1, select: { name: true, email: true } } },
    })

    if (!tenant?.asaasSubscriptionId) {
      return { success: false, error: 'Assinatura não encontrada. Entre em contato com o suporte.' }
    }

    const user = tenant.users[0]
    const creditCard: AsaasCreditCard = {
      holderName: parsed.data.holderName,
      number: parsed.data.number,
      expiryMonth: parsed.data.expiryMonth,
      expiryYear: parsed.data.expiryYear,
      ccv: parsed.data.ccv,
    }
    const holderInfo: AsaasCreditCardHolderInfo & { email: string } = {
      name: parsed.data.holderName,
      email: user?.email ?? '',
      cpfCnpj: parsed.data.cpfCnpj,
      postalCode: parsed.data.postalCode,
      addressNumber: parsed.data.addressNumber,
      phone: parsed.data.phone,
    }

    const result = await updateSubscriptionCreditCard(
      tenant.asaasSubscriptionId,
      creditCard,
      holderInfo
    )

    if (!result.ok) {
      const msg = traduzirErroAsaas(String(result.details ?? result.error))
      return { success: false, error: msg }
    }

    revalidatePath('/billing')
    return { success: true }
  })
}

export async function cancelarAssinatura(): Promise<{ success: boolean; error?: string }> {
  return withTenantAction(async () => {
    const tenantId = getTenantId()
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { asaasSubscriptionId: true },
    })

    if (!tenant?.asaasSubscriptionId) {
      return { success: false, error: 'Assinatura não encontrada.' }
    }

    const result = await cancelSubscription(tenant.asaasSubscriptionId)
    if (!result.ok) {
      return { success: false, error: 'Erro ao cancelar assinatura. Tente novamente.' }
    }

    await db.tenant.update({
      where: { id: tenantId },
      data: { subscriptionStatus: 'CANCELED', status: 'CANCELADO' },
    })

    revalidatePath('/billing')
    return { success: true }
  })
}

export async function reativarAssinatura(): Promise<{ success: boolean; error?: string }> {
  return withTenantAction(async () => {
    const tenantId = getTenantId()
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { asaasSubscriptionId: true },
    })

    if (!tenant?.asaasSubscriptionId) {
      return { success: false, error: 'Assinatura não encontrada.' }
    }

    const result = await restoreSubscription(tenant.asaasSubscriptionId)
    if (!result.ok) {
      return {
        success: false,
        error: 'Não foi possível reativar a assinatura. Contate o suporte se necessário.',
      }
    }

    await db.tenant.update({
      where: { id: tenantId },
      data: { subscriptionStatus: 'ACTIVE', status: 'ATIVO' },
    })

    revalidatePath('/billing')
    return { success: true }
  })
}
