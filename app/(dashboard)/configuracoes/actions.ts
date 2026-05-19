'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth-guard'

export interface ConfigClinicaData {
  nome: string
  corPrimaria: string
  logoBase64?: string | null
  cnpj?: string | null
  endereco?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  telefone?: string | null
  email?: string | null
}

export async function salvarConfigClinica(data: ConfigClinicaData): Promise<{ error?: string }> {
  await assertAdmin()
  try {
    await db.configClinica.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
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
