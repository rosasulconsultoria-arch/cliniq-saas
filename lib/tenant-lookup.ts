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
