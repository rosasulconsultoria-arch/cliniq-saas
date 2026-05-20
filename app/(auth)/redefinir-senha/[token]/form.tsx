'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { redefinirSenha } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RedefinirSenhaForm({ token, userName }: { token: string; userName: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [showNova, setShowNova] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (novaSenha.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return }
    if (novaSenha !== confirmar) { toast.error('As senhas não coincidem'); return }

    startTransition(async () => {
      const result = await redefinirSenha({ token, novaSenha, confirmar })
      if (result?.error) { toast.error(result.error); return }
      toast.success('Senha redefinida! Faça login com a nova senha.')
      router.push('/login')
    })
  }

  return (
    <div className="w-full max-w-md px-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <KeyRound className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Nova senha</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Olá, <strong>{userName}</strong>. Defina sua nova senha.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="novaSenha">Nova senha</Label>
            <div className="relative">
              <Input
                id="novaSenha"
                type={showNova ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="pr-10"
                autoFocus
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNova(!showNova)}
                tabIndex={-1}
              >
                {showNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar">Confirmar senha</Label>
            <div className="relative">
              <Input
                id="confirmar"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repita a senha"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar nova senha
          </Button>
        </form>
      </div>
    </div>
  )
}
