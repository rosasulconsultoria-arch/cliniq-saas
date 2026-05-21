'use server'

import { getTenantDb } from '@/lib/prisma'
import { withTenantAction } from '@/lib/with-tenant-action'
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
  lat?: number | null
  lng?: number | null
}

async function geocodificarEndereco(data: ConfigClinicaData): Promise<{ lat: number; lng: number } | null> {
  try {
    const partes = [data.endereco, data.numero, data.bairro, data.cidade, data.estado, 'Brasil'].filter(Boolean)
    if (partes.length < 2) return null
    const q = encodeURIComponent(partes.join(', '))
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'User-Agent': 'ClinicaPsiGestao/1.0 (clinica-psi-rosy.vercel.app)' },
    })
    const json = await res.json()
    if (!json?.[0]) return null
    return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) }
  } catch {
    return null
  }
}

export async function salvarConfigClinica(data: ConfigClinicaData): Promise<{ error?: string }> {
  return withTenantAction(async () => {
    await assertAdmin()
    try {
      const coords = await geocodificarEndereco(data)
      const payload = { ...data, ...(coords ? { lat: coords.lat, lng: coords.lng } : {}) }

      const db = getTenantDb()
      // ConfigClinica agora tem tenantId — não existe mais id='default' global.
      // Buscamos a config do tenant atual e fazemos update ou create.
      // Ajuste de unicidade: upsert por id='default' substituído por findFirst + update/create.
      const existing = await db.configClinica.findFirst()
      if (existing) {
        await db.configClinica.update({ where: { id: existing.id }, data: payload })
      } else {
        await db.configClinica.create({ data: payload })
      }

      revalidatePath('/', 'layout')
      return {}
    } catch (e) {
      console.error(e)
      return { error: 'Erro ao salvar configurações.' }
    }
  })
}

export async function getConfigClinica() {
  return withTenantAction(async () => {
    const db = getTenantDb()
    return db.configClinica.findFirst()
  })
}
