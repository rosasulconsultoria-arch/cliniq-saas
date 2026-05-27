import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { getTenantBilling } from '@/lib/tenant-lookup'
import { classificarAcessoTenant } from '@/lib/billing/status'

type AccessResult =
  | { ok: true }
  | { ok: false; response: NextResponse }

/**
 * Verifica se o tenant tem acesso de billing para mutações.
 * Usar em route handlers POST/PUT/PATCH/DELETE que modificam dados de negócio.
 *
 * Rotas que NÃO devem usar este helper:
 * - GETs de leitura
 * - /api/asaas/saas-webhook (Asaas precisa chamar mesmo se BLOCKED)
 * - /api/auth/* (login)
 * - /api/cron/* (jobs do sistema)
 * - Server Actions de /agendar/[slug] (agendamento público de pacientes)
 *
 * @example
 * export async function POST(req: NextRequest) {
 *   const acesso = await requireBillingAccess()
 *   if (!acesso.ok) return acesso.response
 *   // ... lógica normal
 * }
 */
export async function requireBillingAccess(): Promise<AccessResult> {
  const headersList = await headers()
  const slug = headersList.get('x-tenant-slug')

  if (!slug) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'tenant_not_found' },
        { status: 400 }
      ),
    }
  }

  const tenantBilling = await getTenantBilling(slug)

  if (!tenantBilling) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'tenant_not_found' },
        { status: 404 }
      ),
    }
  }

  const acesso = classificarAcessoTenant(tenantBilling)

  if (acesso.level === 'BLOCKED') {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'payment_required',
          reason: acesso.reason,
          message: 'Assinatura inativa. Acesse /billing/upgrade para regularizar.',
        },
        { status: 402 }
      ),
    }
  }

  return { ok: true }
}

/**
 * Versão para Server Actions: retorna a string de erro ou null se ok.
 *
 * @example
 * export async function criarProfissional(data: unknown) {
 *   return withTenantAction(async () => {
 *     const erroBilling = await verificarBillingAction()
 *     if (erroBilling) return { error: erroBilling }
 *     // ... lógica normal
 *   })
 * }
 */
export async function verificarBillingAction(): Promise<string | null> {
  const headersList = await headers()
  const slug = headersList.get('x-tenant-slug')
  if (!slug) return null // sem slug → middleware vai bloquear de qualquer forma

  const tenantBilling = await getTenantBilling(slug)
  if (!tenantBilling) return null

  const acesso = classificarAcessoTenant(tenantBilling)
  if (acesso.level === 'BLOCKED') {
    return 'Assinatura inativa. Acesse /billing/upgrade para regularizar.'
  }
  return null
}
