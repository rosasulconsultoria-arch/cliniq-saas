import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTenantDb } from '@/lib/prisma'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { TrialBanner } from '@/components/billing/TrialBanner'
import { PostSignupTour } from '@/components/onboarding/PostSignupTour'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.mustChangePassword) {
    redirect('/trocar-senha')
  }

  const db = getTenantDb()
  const config = await db.configClinica.findFirst()

  return (
    <>
      <TrialBanner />
      <DashboardShell
        user={{
          id: session.user.id,
          name: session.user.name ?? 'Usuário',
          email: session.user.email ?? '',
          role: session.user.role,
        }}
        clinicaNome={config?.nome ?? 'Clínica'}
        clinicaLogo={config?.logoBase64 ?? null}
        clinicaCor={config?.corPrimaria ?? '#4f46e5'}
      >
        <PostSignupTour />
        {children}
      </DashboardShell>
    </>
  )
}
