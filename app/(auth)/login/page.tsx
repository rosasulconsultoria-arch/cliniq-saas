import { type Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'
import { getTenantDb } from '@/lib/prisma'

export const metadata: Metadata = { title: 'Login' }

interface Props {
  searchParams: { callbackUrl?: string }
}

export default async function LoginPage({ searchParams }: Props) {
  const db = getTenantDb()
  const config = await db.configClinica.findFirst()
  const nome = config?.nome ?? 'Clínica de Psicologia'
  const logo = config?.logoBase64 ?? null
  const cor = config?.corPrimaria ?? '#4f46e5'

  return (
    <div className="w-full max-w-md px-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 space-y-6">
        {/* Logo + título */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="h-16 w-16 rounded-2xl shadow-sm overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: logo ? 'transparent' : cor }}
          >
            {logo ? (
              <img src={logo} alt={nome} className="h-full w-full object-cover" />
            ) : (
              <span className="text-white font-bold text-2xl select-none">
                {nome.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{nome}</p>
            <h1 className="text-xl font-semibold tracking-tight mt-2">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Entre para acessar o sistema de gestão
            </p>
          </div>
        </div>

        <LoginForm callbackUrl={searchParams.callbackUrl || '/dashboard'} />
      </div>
    </div>
  )
}
