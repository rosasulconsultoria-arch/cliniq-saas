import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) return new Response('Não autorizado', { status: 401 })

  const profissionalId = new URL(req.url).searchParams.get('profissionalId')
  if (!profissionalId) return Response.json({ temAsaas: false })

  const prof = await db.profissional.findUnique({
    where: { id: profissionalId },
    select: { asaasApiKey: true },
  })

  return Response.json({ temAsaas: !!prof?.asaasApiKey })
}
