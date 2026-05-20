'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { solicitarRecuperacaoSenha } from './actions'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await solicitarRecuperacaoSenha({ email })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setEnviado(true)
    })
  }

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
              Informe seu e-mail e enviaremos um link de recuperação.
            </p>
          </div>
        </div>

        {enviado ? (
          <div className="flex flex-col items-center gap-3 text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm text-muted-foreground">
              Se este e-mail estiver cadastrado, você receberá as instruções em breve.
              Verifique sua caixa de entrada (e o spam).
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoFocus
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar link de recuperação
            </Button>
          </form>
        )}

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
