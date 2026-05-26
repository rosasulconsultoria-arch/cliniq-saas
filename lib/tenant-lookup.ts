import { unstable_cache } from 'next/cache'
import { db } from './db'

/**
 * Busca um tenant pelo slug com cache de 5 minutos.
 *
 * Cache por slug — cada slug tem sua própria entrada no cache.
 * Invalidar via revalidateTag('tenants') quando um Tenant for atualizado
 * (implementar na server action de configuração da clínica no Prompt 1.6).
 *
 * TODO(performance): ao implementar atualização de Tenant, chamar:
 *   revalidateTag('tenants')
 */
export const getTenantBySlug = unstable_cache(
  async (slug: string) => {
    return db.tenant.findFirst({
      where: { slug },
      select: { id: true, nome: true, status: true },
    })
  },
  ['tenant-by-slug'],
  { revalidate: 300, tags: ['tenants'] }
)

/**
 * Busca campos de billing do tenant com cache curto (60s).
 * Usado pelo middleware para verificar nível de acesso.
 * Cache curto porque mudanças de status vêm via webhook que invalida a tag 'tenants'.
 */
export const getTenantBilling = unstable_cache(
  async (slug: string) => {
    return db.tenant.findFirst({
      where: { slug },
      select: {
        id: true,
        status: true,
        trialEndsAt: true,
        subscriptionStatus: true,
        avisoPagamento: true,
        avisoPagamentoDesde: true,
      },
    })
  },
  ['tenant-billing'],
  { revalidate: 60, tags: ['tenants'] }
)
