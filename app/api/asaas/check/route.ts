import { auth } from '@/lib/auth'
import { getTenantDb } from '@/lib/prisma'
import { runWithTenant } from '@/lib/tenant-context'

// TODO(segurança): se um webhook real do Asaas for adicionado no futuro,
// implementar validação de assinatura HMAC antes de qualquer query.
// Esta rota é autenticada por sessão (não é webhook externo).

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Não autorizado', { status: 401 })

  const profissionalId = new URL(req.url).searchParams.get('profissionalId')
  if (!profissionalId) return Response.json({ temAsaas: false })

  return runWithTenant(session.user.tenantId, async () => {
    const db = getTenantDb()
    const prof = await db.profissional.findUnique({
      where: { id: profissionalId },
      select: { asaasApiKey: true },
    })
    return Response.json({ temAsaas: !!prof?.asaasApiKey })
  })
}
