'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth-guard'

export async function salvarConfigClinica(data: {
  nome: string
  corPrimaria: string
  logoBase64?: string | null
}): Promise<{ error?: string }> {
  await assertAdmin()
  try {
    await db.configClinica.upsert({
      where: { id: 'default' },
      update: { nome: data.nome, corPrimaria: data.corPrimaria, logoBase64: data.logoBase64 ?? null },
      create: { id: 'default', nome: data.nome, corPrimaria: data.corPrimaria, logoBase64: data.logoBase64 ?? null },
    })
    revalidatePath('/', 'layout')
    return {}
  } catch (e) {
    console.error(e)
    return { error: 'Erro ao salvar configurações.' }
  }
}

export async function getConfigClinica() {
  return db.configClinica.findUnique({ where: { id: 'default' } })
}
