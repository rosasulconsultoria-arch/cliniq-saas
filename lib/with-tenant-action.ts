/**
 * withTenantAction — guarda obrigatório para Server Actions com dados tenant-scoped.
 *
 * Motivo da separação de lib/tenant-context.ts:
 * tenant-context.ts é puro Node.js (AsyncLocalStorage), testável sem Next.js.
 * Este arquivo importa next/headers e next/cache, que são específicos do runtime
 * do Next.js e exigem mocking em testes. A separação mantém tenant-context.ts
 * totalmente testável sem dependências do framework.
 *
 * Ver docs/server-actions-pattern.md para o padrão obrigatório de uso.
 */

import { headers } from 'next/headers'
import { runWithTenant } from './tenant-context'
import { getTenantBySlug } from './tenant-lookup'

/**
 * Executa uma Server Action dentro do contexto de tenant correto.
 *
 * Lê x-tenant-slug dos headers da request (injetado pelo middleware),
 * resolve o tenantId via cache, e executa o callback com runWithTenant.
 *
 * @throws Se x-tenant-slug estiver ausente (middleware não configurado)
 * @throws Se o tenant não existir no banco
 *
 * @example
 * export async function criarPaciente(data: FormData) {
 *   return withTenantAction(async () => {
 *     const prisma = getTenantDb()
 *     return prisma.paciente.create({ data: { ... } })
 *   })
 * }
 */
export async function withTenantAction<T>(fn: () => Promise<T>): Promise<T> {
  // Next.js 14: headers() é síncrono. Em Next.js 15+, usar await headers()
  const headersList = await headers()
  const slug = headersList.get('x-tenant-slug')

  if (!slug) {
    throw new Error(
      '[withTenantAction] Header x-tenant-slug ausente na request. ' +
        'Verifique se o middleware.ts está configurado corretamente. ' +
        'Ver docs/tenant-routing.md.'
    )
  }

  const tenant = await getTenantBySlug(slug)

  if (!tenant) {
    throw new Error(
      `[withTenantAction] Tenant não encontrado para slug "${slug}". ` +
        'O tenant existe no banco e está com status ATIVO?'
    )
  }

  return runWithTenant(tenant.id, fn)
}
