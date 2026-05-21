import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { DashboardShell } from '@/components/layout/dashboard-shell'

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

  // TODO: aplicar withTenantAction + getTenantDb() — refatoração no Prompt 1.6
  const config = await db.configClinica.findUnique({ where: { id: 'default' } })

  return (
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
      {children}
    </DashboardShell>
  )
}
