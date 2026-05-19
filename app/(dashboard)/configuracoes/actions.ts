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
  await assertAdmin()
  try {
    // Geocodifica o endereço completo para obter coordenadas precisas
    const coords = await geocodificarEndereco(data)
    const payload = { ...data, ...(coords ? { lat: coords.lat, lng: coords.lng } : {}) }

    await db.configClinica.upsert({
      where: { id: 'default' },
      update: payload,
      create: { id: 'default', ...payload },
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
