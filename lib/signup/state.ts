import { cookies } from 'next/headers'
import { db } from '../db'
import type { SignupDraft, Prisma } from '@prisma/client'

const COOKIE_NAME = 'signup_draft_id'
const DRAFT_TTL_DAYS = 7

export async function createDraft(): Promise<SignupDraft> {
  const expiresAt = new Date(Date.now() + DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000)
  return db.signupDraft.create({ data: { expiresAt } })
}

export async function getDraft(draftId: string): Promise<SignupDraft | null> {
  return db.signupDraft.findUnique({ where: { id: draftId } })
}

export async function getCurrentDraftId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value ?? null
}

export async function setCurrentDraftId(draftId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, draftId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: DRAFT_TTL_DAYS * 24 * 60 * 60,
  })
}

export async function clearDraft(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function updateDraft(
  draftId: string,
  data: Prisma.SignupDraftUpdateInput
): Promise<SignupDraft> {
  return db.signupDraft.update({ where: { id: draftId }, data })
}

export async function markFinalized(draftId: string): Promise<void> {
  await db.signupDraft.update({ where: { id: draftId }, data: { finalized: true } })
}

export async function cleanupExpiredDrafts(): Promise<number> {
  const result = await db.signupDraft.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  return result.count
}
