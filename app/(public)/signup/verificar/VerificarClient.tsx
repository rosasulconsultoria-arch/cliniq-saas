'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Mail } from 'lucide-react'
import Link from 'next/link'
import { reenviarEmailVerificacao } from '../actions'

interface VerificarClientProps {
  emailMascarado: string
  cooldownInicial: number
}

export function VerificarClient({ emailMascarado, cooldownInicial }: VerificarClientProps) {
  const [segundos, setSegundos] = useState(cooldownInicial)
  const [enviado, setEnviado] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (segundos <= 0) return
    const timer = setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [segundos])

  const handleReenviar = () => {
    startTransition(async () => {
      const result = await reenviarEmailVerificacao()
      if (result.success) {
        setSegundos(60)
        setEnviado(true)
      } else if (result.cooldownSegundos) {
        setSegundos(result.cooldownSegundos)
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Mail className="h-10 w-10 text-primary" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Enviamos um email para você</h1>
        <p className="text-muted-foreground">
          Verifique sua caixa de entrada em{' '}
          <span className="font-semibold text-foreground">{emailMascarado}</span> e clique no link
          de confirmação.
        </p>
        <p className="text-sm text-muted-foreground">Não esqueça de checar a caixa de spam.</p>
      </div>

      {enviado && (
        <p className="text-sm text-green-600 dark:text-green-400">
          ✓ Email reenviado com sucesso!
        </p>
      )}

      <Button
        variant="outline"
        disabled={segundos > 0 || isPending}
        onClick={handleReenviar}
        className="min-w-44"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando...
          </>
        ) : segundos > 0 ? (
          `Aguarde ${segundos}s...`
        ) : (
          'Reenviar email'
        )}
      </Button>

      <Link
        href="/signup/admin"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Email errado? Voltar e corrigir
      </Link>
    </div>
  )
}
