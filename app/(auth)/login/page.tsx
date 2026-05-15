import { type Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Login' }

interface Props {
  searchParams: { callbackUrl?: string }
}

export default function LoginPage({ searchParams }: Props) {
  return (
    <div className="w-full max-w-md px-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 space-y-6">
        {/* Logo + título */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg select-none">CP</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Bem-vindo de volta</h1>
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
