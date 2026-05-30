import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTenantBySlug } from './tenant-lookup'

/**
 * Resolve o tenant atual via header x-tenant-slug (injetado pelo middleware).
 * Para uso em Server Components do dashboard onde ALS não propaga no pipeline React 19.
 * Redireciona para /login se o tenant não puder ser resolvido.
 */
export async function getCurrentTenant() {
  const slug = (await headers()).get('x-tenant-slug') ?? ''
  const tenant = slug ? await getTenantBySlug(slug) : null
  if (!tenant) redirect('/login')
  return tenant
}
