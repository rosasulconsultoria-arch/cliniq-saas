import { type Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const metadata: Metadata = { title: 'Recuperar Senha' }

export default function EsqueciSenhaPage() {
  return (
    <div className="w-full max-w-md px-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg select-none">CP</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Recuperar senha</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Informe seu email e enviaremos as instruções de recuperação.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              disabled
            />
          </div>

          <Button className="w-full" disabled>
            Enviar instruções
            <span className="ml-2 text-xs opacity-60">(em breve)</span>
          </Button>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para o login
        </Link>
      </div>
    </div>
  )
}
