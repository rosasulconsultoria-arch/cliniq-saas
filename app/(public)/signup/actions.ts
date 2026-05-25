'use server'

import { db } from '@/lib/db'
import {
  createDraft,
  getDraft,
  getCurrentDraftId,
  setCurrentDraftId,
  updateDraft,
} from '@/lib/signup/state'
import { planoSchema, clinicaSchema, adminSchema } from '@/lib/signup/validators'
import { isReservedSlug, generateSlugSuggestions } from '@/lib/signup/slug'
import { sendVerificationEmail } from '@/lib/signup/email-templates'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import type { SignupDraft } from '@prisma/client'

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
): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const draft = await db.signupDraft.findFirst({ where: { emailToken: token } })

  if (!draft) {
    return { success: false, error: 'Token inválido' }
  }

  if (draft.emailTokenExp && draft.emailTokenExp < new Date()) {
    return {
      success: false,
      error: 'Token expirado. Solicite um novo email de verificação.',
    }
  }

  if (draft.emailVerificado) {
    await setCurrentDraftId(draft.id)
    return { success: true, draftId: draft.id }
  }

  await db.signupDraft.update({
    where: { id: draft.id },
    data: { emailVerificado: true, emailToken: null, emailTokenExp: null },
  })

  await setCurrentDraftId(draft.id)

  return { success: true, draftId: draft.id }
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
