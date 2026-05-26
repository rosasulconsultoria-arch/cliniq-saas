import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { PLANOS } from '@/lib/plans'
import { SucessoClient } from './SucessoClient'

export default async function SucessoPage() {
  const session = await auth()

  // Sem sessão — o finalizarSignup não conseguiu criar o JWT cookie
  // Tentar ler draft para ver se há tenant criado via slug
  if (!session?.user?.tenantId) {
    redirect('/signup/cartao')
  }

  const tenant = await db.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { slug: true, nome: true, plano: true, trialEndsAt: true },
  })

  if (!tenant) redirect('/signup/cartao')

  const planoConfig = PLANOS[tenant.plano]
  const baseDomain = process.env.BASE_DOMAIN ?? 'cliniq.com.br'
  const isProduction = process.env.NODE_ENV === 'production'
  const clinicaUrl = isProduction
    ? `https://${tenant.slug}.${baseDomain}`
    : `http://localhost:3000`

  const trialEndsAt = tenant.trialEndsAt
    ? tenant.trialEndsAt.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  return (
    <SucessoClient
      nomeClinica={tenant.nome}
      slug={tenant.slug}
      nomePlano={planoConfig.nome}
      trialEndsAt={trialEndsAt}
      clinicaUrl={clinicaUrl}
      isProduction={isProduction}
    />
  )
}
