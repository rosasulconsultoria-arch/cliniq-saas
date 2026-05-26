'use server'

import { db } from '@/lib/db'
import {
  createDraft,
  getDraft,
  getCurrentDraftId,
  setCurrentDraftId,
  updateDraft,
  clearDraft,
} from '@/lib/signup/state'
import { planoSchema, clinicaSchema, adminSchema } from '@/lib/signup/validators'
import { isReservedSlug, generateSlugSuggestions } from '@/lib/signup/slug'
import { sendVerificationEmail } from '@/lib/signup/email-templates'
import {
  createCustomer,
  createSubscription,
  deleteCustomer,
  calcularNextDueDate,
  calcularTrialEndsAt,
  traduzirErroAsaas,
} from '@/lib/asaas-saas'
import { PLANOS } from '@/lib/plans'
import { encode } from 'next-auth/jwt'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import type { SignupDraft, Periodicidade } from '@prisma/client'

// ─── 1. escolherPlano ─────────────────────────────────────────────────────────

export async function escolherPlano(data: {
  planoId: string
  periodicidade: string
}): Promise<{ success: boolean; draftId?: string; errors?: Record<string, string[]> }> {
  const result = planoSchema.safeParse(data)
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors }
  }

  let draftId = await getCurrentDraftId()
  if (!draftId) {
    const draft = await createDraft()
    await setCurrentDraftId(draft.id)
    draftId = draft.id
  }

  await updateDraft(draftId, {
    planoId: data.planoId as any,
    periodicidade: data.periodicidade as any,
    step: 0,
  })

  return { success: true, draftId }
}

// ─── 2. validarSlug ───────────────────────────────────────────────────────────

export async function validarSlug(
  slug: string
): Promise<{ available: boolean; suggestions?: string[] }> {
  if (isReservedSlug(slug)) {
    return { available: false }
  }

  const tenantMatch = await db.tenant.findUnique({ where: { slug } })
  if (tenantMatch) {
    const suggestions = generateSlugSuggestions(slug, [slug])
    return { available: false, suggestions }
  }

  const draftMatch = await db.signupDraft.findFirst({
    where: { slug, finalized: false, expiresAt: { gt: new Date() } },
  })
  if (draftMatch) {
    const suggestions = generateSlugSuggestions(slug, [slug])
    return { available: false, suggestions }
  }

  return { available: true }
}

// ─── 3. salvarClinica ─────────────────────────────────────────────────────────

export async function salvarClinica(data: {
  nomeClinica: string
  slug: string
  especialidade: string
  telefone: string
}): Promise<{ success: boolean; errors?: Record<string, string[]> }> {
  const result = clinicaSchema.safeParse(data)
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors }
  }

  const slugCheck = await validarSlug(data.slug)
  if (!slugCheck.available) {
    return { success: false, errors: { slug: ['Este endereço já está em uso'] } }
  }

  const draftId = await getCurrentDraftId()
  if (!draftId) {
    return {
      success: false,
      errors: { _form: ['Sessão expirada. Inicie o cadastro novamente.'] },
    }
  }

  await updateDraft(draftId, {
    nomeClinica: data.nomeClinica,
    slug: data.slug,
    especialidade: data.especialidade,
    telefone: data.telefone,
    step: 1,
  })

  return { success: true }
}

// ─── 4. salvarAdmin ───────────────────────────────────────────────────────────

export async function salvarAdmin(data: {
  nomeAdmin: string
  emailAdmin: string
  senha: string
  confirmacaoSenha: string
  termosAceitos: boolean
}): Promise<{ success: boolean; emailEnviado: boolean; errors?: Record<string, string[]> }> {
  const result = adminSchema.safeParse(data)
  if (!result.success) {
    return { success: false, emailEnviado: false, errors: result.error.flatten().fieldErrors }
  }

  const draftId = await getCurrentDraftId()
  if (!draftId) {
    return {
      success: false,
      emailEnviado: false,
      errors: { _form: ['Sessão expirada. Inicie o cadastro novamente.'] },
    }
  }

  const passwordHash = await bcrypt.hash(data.senha, 12)
  const emailToken = crypto.randomBytes(32).toString('hex')
  const emailTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const draft = await getDraft(draftId)

  await updateDraft(draftId, {
    nomeAdmin: data.nomeAdmin,
    emailAdmin: data.emailAdmin,
    passwordHash,
    emailToken,
    emailTokenExp,
    step: 2,
    lastEmailSentAt: new Date(),
  })

  const { emailEnviado } = await sendVerificationEmail(
    data.emailAdmin,
    emailToken,
    draft?.nomeClinica ?? 'sua clínica'
  )

  return { success: true, emailEnviado }
}

// ─── 5. reenviarEmailVerificacao ──────────────────────────────────────────────

export async function reenviarEmailVerificacao(): Promise<{
  success: boolean
  cooldownSegundos?: number
  emailEnviado?: boolean
}> {
  const draftId = await getCurrentDraftId()
  if (!draftId) return { success: false }

  const draft = await getDraft(draftId)
  if (!draft) return { success: false }

  if (draft.lastEmailSentAt) {
    const elapsed = Date.now() - draft.lastEmailSentAt.getTime()
    if (elapsed < 60_000) {
      const cooldownSegundos = Math.ceil((60_000 - elapsed) / 1000)
      return { success: false, cooldownSegundos }
    }
  }

  const newToken = crypto.randomBytes(32).toString('hex')
  const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await updateDraft(draftId, {
    emailToken: newToken,
    emailTokenExp: newExpiry,
    lastEmailSentAt: new Date(),
  })

  const { emailEnviado } = await sendVerificationEmail(
    draft.emailAdmin!,
    newToken,
    draft.nomeClinica ?? 'sua clínica'
  )

  return { success: true, emailEnviado }
}

// ─── 6. verificarEmailToken ───────────────────────────────────────────────────

export async function verificarEmailToken(
  token: string
): Promise<{
  success: boolean
  draftId?: string
  error?: 'invalid' | 'expired' | 'used'
}> {
  const draft = await db.signupDraft.findFirst({ where: { emailToken: token } })

  if (!draft) {
    return { success: false, error: 'invalid' }
  }

  if (draft.emailTokenExp && draft.emailTokenExp < new Date()) {
    return { success: false, error: 'expired' }
  }

  if (draft.emailTokenUsed || draft.emailVerificado) {
    await setCurrentDraftId(draft.id)
    return { success: false, error: 'used', draftId: draft.id }
  }

  await db.signupDraft.update({
    where: { id: draft.id },
    data: { emailVerificado: true, emailTokenUsed: true },
  })

  await setCurrentDraftId(draft.id)

  return { success: true, draftId: draft.id }
}

// ─── 8. finalizarSignup ───────────────────────────────────────────────────────

export type FinalizarSignupInput = {
  holderName: string
  number: string
  expiryMonth: string
  expiryYear: string
  ccv: string
  cpfCnpj: string
  postalCode: string
  addressNumber: string
  phone: string
}

export type FinalizarSignupResult =
  | { success: true; slug: string; redirectUrl: string }
  | { success: false; error: string; campo?: string }

export async function finalizarSignup(
  dadosCartao: FinalizarSignupInput
): Promise<FinalizarSignupResult> {
  // 1. Verificar draft
  const draftId = await getCurrentDraftId()
  if (!draftId) return { success: false, error: 'Sessão expirada. Inicie o cadastro novamente.' }

  const draft = await getDraft(draftId)
  if (!draft) return { success: false, error: 'Sessão não encontrada. Inicie o cadastro novamente.' }

  // 2. Idempotência — draft já finalizado
  if (draft.finalized) {
    const tenant = await db.tenant.findFirst({ where: { slug: draft.slug! } })
    if (tenant) return { success: true, slug: tenant.slug, redirectUrl: `/signup/sucesso` }
  }

  // 3. Verificar email verificado
  if (!draft.emailVerificado) {
    return { success: false, error: 'E-mail não verificado. Verifique sua caixa de entrada.' }
  }

  // 4. Verificar dados obrigatórios do draft
  if (!draft.planoId || !draft.periodicidade || !draft.slug || !draft.nomeClinica ||
      !draft.nomeAdmin || !draft.emailAdmin || !draft.passwordHash) {
    return { success: false, error: 'Cadastro incompleto. Revise os passos anteriores.' }
  }

  // 5. Lock de finalização (idempotência contra double-submit)
  if (draft.finalizing) {
    const lockAge = Date.now() - draft.updatedAt.getTime()
    if (lockAge < 5 * 60 * 1000) {
      return { success: false, error: 'Processamento em andamento. Aguarde alguns instantes.' }
    }
  }

  await updateDraft(draftId, { finalizing: true })

  const planoConfig = PLANOS[draft.planoId]
  const periodicidade = draft.periodicidade as Periodicidade
  const cycle = periodicidade === 'ANUAL' ? 'YEARLY' : 'MONTHLY'
  const valueCents = periodicidade === 'ANUAL'
    ? planoConfig.precos.anual.cents
    : planoConfig.precos.mensal.cents
  const nextDueDate = calcularNextDueDate(14)
  const trialEndsAt = calcularTrialEndsAt(14)

  // 6. Criar ou reutilizar customer Asaas
  let asaasCustomerId = draft.asaasCustomerId

  if (!asaasCustomerId) {
    const customerResult = await createCustomer({
      name: draft.nomeClinica,
      email: draft.emailAdmin,
      cpfCnpj: dadosCartao.cpfCnpj,
      phone: dadosCartao.phone,
      externalReference: draftId,
    })

    if (!customerResult.ok) {
      await updateDraft(draftId, { finalizing: false })
      return { success: false, error: 'Erro ao registrar dados. Tente novamente.' }
    }

    asaasCustomerId = customerResult.data.id
    await updateDraft(draftId, { asaasCustomerId })
  }

  // 7. Criar subscription Asaas
  let asaasSubscriptionId = draft.asaasSubscriptionId

  if (!asaasSubscriptionId) {
    const subscriptionResult = await createSubscription({
      customer: asaasCustomerId,
      billingType: 'CREDIT_CARD',
      value: valueCents,
      nextDueDate,
      cycle,
      description: `Cliniq ${planoConfig.nome} — ${draft.nomeClinica}`,
      externalReference: `draft:${draftId}`,
      creditCard: {
        holderName: dadosCartao.holderName,
        number: dadosCartao.number,
        expiryMonth: dadosCartao.expiryMonth,
        expiryYear: dadosCartao.expiryYear,
        ccv: dadosCartao.ccv,
      },
      creditCardHolderInfo: {
        name: dadosCartao.holderName,
        email: draft.emailAdmin,
        cpfCnpj: dadosCartao.cpfCnpj,
        postalCode: dadosCartao.postalCode,
        addressNumber: dadosCartao.addressNumber,
        phone: dadosCartao.phone,
      },
    })

    if (!subscriptionResult.ok) {
      // Rollback: deletar customer criado agora
      await deleteCustomer(asaasCustomerId).catch((e) =>
        console.error('[finalizarSignup] falha ao deletar customer após erro:', e)
      )
      await updateDraft(draftId, { finalizing: false, asaasCustomerId: null })

      // Extrair código de erro do Asaas para mensagem amigável
      const details = subscriptionResult.details as any
      const errorCode = details?.body?.errors?.[0]?.code ?? details?.body?.errors?.[0]?.description ?? ''
      return { success: false, error: traduzirErroAsaas(errorCode) }
    }

    asaasSubscriptionId = subscriptionResult.data.id
    await updateDraft(draftId, { asaasSubscriptionId })
  }

  // 8. Transação de banco: criar Tenant + User
  let createdTenant: { id: string; slug: string }
  let createdUserId: string

  try {
    const result = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: draft.slug!,
          nome: draft.nomeClinica!,
          plano: draft.planoId!,
          periodicidade: draft.periodicidade!,
          status: 'TRIAL',
          subscriptionStatus: 'TRIALING',
          trialEndsAt,
          asaasCustomerId,
          asaasSubscriptionId,
        },
      })

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: draft.nomeAdmin!,
          email: draft.emailAdmin!,
          passwordHash: draft.passwordHash!,
          role: 'ADMIN',
          mustChangePassword: false,
        },
      })

      return { tenant, user }
    })

    createdTenant = result.tenant
    createdUserId = result.user.id
  } catch (err: unknown) {
    // Rollback Asaas
    await deleteCustomer(asaasCustomerId).catch((e) =>
      console.error('[finalizarSignup] falha ao deletar customer no rollback DB:', e)
    )
    await updateDraft(draftId, { finalizing: false, asaasCustomerId: null, asaasSubscriptionId: null })

    const prismaErr = err as any
    if (prismaErr?.code === 'P2002') {
      return {
        success: false,
        error: 'Esse endereço foi escolhido por outra clínica. Por favor escolha outro.',
        campo: 'slug',
      }
    }

    console.error('[finalizarSignup] erro no transaction:', err)
    return { success: false, error: 'Erro interno ao criar sua conta. Tente novamente.' }
  }

  // 9. Marcar draft como finalizado e limpar cookie
  await updateDraft(draftId, { finalized: true, finalizing: false })
  await clearDraft()

  // 10. Criar sessão Auth.js via JWT encode (sem redirect — usuário já logado)
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = isProduction
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token'

    const sessionToken = await encode({
      token: {
        sub: createdUserId,
        id: createdUserId,
        name: draft.nomeAdmin!,
        email: draft.emailAdmin!,
        role: 'ADMIN',
        tenantId: createdTenant.id,
        mustChangePassword: false,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60,
    })

    const cookieStore = await cookies()
    cookieStore.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isProduction,
      maxAge: 30 * 24 * 60 * 60,
      domain: isProduction ? `.${process.env.BASE_DOMAIN ?? 'cliniq.com.br'}` : undefined,
    })
  } catch (err) {
    // Sessão não criada, mas signup foi bem-sucedido — usuário precisará logar manualmente
    console.error('[finalizarSignup] falha ao criar sessão JWT:', err)
  }

  return {
    success: true,
    slug: createdTenant.slug,
    redirectUrl: `/signup/sucesso`,
  }
}

// ─── 7. getCurrentDraftStatus ─────────────────────────────────────────────────

export async function getCurrentDraftStatus(): Promise<{
  draft: SignupDraft | null
  draftId: string | null
}> {
  const draftId = await getCurrentDraftId()
  if (!draftId) return { draft: null, draftId: null }

  const draft = await getDraft(draftId)
  return { draft, draftId }
}
