'use server'

import { headers } from 'next/headers'
import { db } from '@/lib/db'
import { getTenantBySlug } from '@/lib/tenant-lookup'
import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'
import { PostSignupTourClient } from './PostSignupTourClient'

const ESSENTIAL_TOUR_ITEMS = ['logo', 'profissional', 'local'] as const
const OPTIONAL_TOUR_ITEMS = ['paciente'] as const

export interface TourItem {
  id: string
  label: string
  href: string
  done: boolean
  essencial: boolean
}

export async function PostSignupTour() {
  const headersList = await headers()
  const slug = headersList.get('x-tenant-slug')
  if (!slug) return null

  const tenant = await getTenantBySlug(slug)
  if (!tenant) return null

  // Só mostra para tenants novos (status TRIAL e tourCompleted = false)
  const tenantFull = await db.tenant.findUnique({
    where: { id: tenant.id },
    select: { tourCompleted: true, status: true },
  })
  if (!tenantFull || tenantFull.tourCompleted) return null

  // Busca contagens no banco do tenant
  const tenantDb = getTenantDb()
  const [config, profissionaisCount, locaisCount, pacientesCount] = await runWithTenant(
    tenant.id,
    () =>
      Promise.all([
        tenantDb.configClinica.findFirst({ select: { logoBase64: true } }),
        tenantDb.profissional.count(),
        tenantDb.local.count(),
        tenantDb.paciente.count(),
      ])
  )

  const items: TourItem[] = [
    {
      id: 'logo',
      label: 'Configure o logo e dados da clínica',
      href: '/configuracoes',
      done: !!config?.logoBase64,
      essencial: true,
    },
    {
      id: 'profissional',
      label: 'Adicione seu primeiro profissional',
      href: '/profissionais/novo',
      done: profissionaisCount >= 1,
      essencial: true,
    },
    {
      id: 'local',
      label: 'Configure seu primeiro local de atendimento',
      href: '/locais/novo',
      done: locaisCount >= 1,
      essencial: true,
    },
    {
      id: 'paciente',
      label: 'Cadastre seu primeiro paciente (opcional)',
      href: '/pacientes/novo',
      done: pacientesCount >= 1,
      essencial: false,
    },
  ]

  const essenciaisCompletos = items.filter((i) => i.essencial && i.done).length

  return <PostSignupTourClient items={items} essenciaisCompletos={essenciaisCompletos} />
}
