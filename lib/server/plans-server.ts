import { db } from '@/lib/db'
import { PLANOS, type PlanoConfig } from '@/lib/plans'

/**
 * Lê o plano atual de um tenant do banco.
 * USO RECOMENDADO: apenas quando o tenantId é o único contexto disponível.
 * NÃO USE em loops ou hot paths — prefira passar o plano por parâmetro ou cachear no início da Server Action.
 */
export async function getCurrentPlan(tenantId: string): Promise<PlanoConfig> {
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { plano: true },
  })
  return PLANOS[tenant.plano]
}
