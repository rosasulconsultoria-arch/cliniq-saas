import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressIndicator } from '@/components/signup/ProgressIndicator'
import { VerificarClient } from './VerificarClient'
import { getCurrentDraftStatus } from '../actions'
import { mascararEmail, cooldownVisual } from '@/lib/signup/ui-helpers'

interface VerificarPageProps {
  searchParams: Promise<{ erro?: string }>
}

export default async function VerificarPage({ searchParams }: VerificarPageProps) {
  const { erro } = await searchParams

  if (erro === 'expirado') {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Link expirado</h1>
          <p className="text-muted-foreground">
            Este link de verificação expirou. Volte ao cadastro e solicite um novo email.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/signup/verificar">Solicitar novo email</Link>
        </Button>
      </div>
    )
  }

  if (erro === 'invalido') {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Link inválido</h1>
          <p className="text-muted-foreground">
            Este link não é válido. Se você acabou de se cadastrar, tente o link do email mais
            recente.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/signup/plano">Iniciar novo cadastro</Link>
        </Button>
      </div>
    )
  }

  const { draft } = await getCurrentDraftStatus()

  if (!draft?.planoId) redirect('/signup/plano')
  if (!draft.nomeClinica || !draft.slug) redirect('/signup/clinica')
  if (!draft.emailAdmin) redirect('/signup/admin')
  if (draft.emailVerificado) redirect('/signup/sucesso-temporario')

  const emailMascarado = mascararEmail(draft.emailAdmin)
  const cooldownInicial = cooldownVisual(draft.lastEmailSentAt)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center">
        <ProgressIndicator currentStep={2} waiting />
      </div>
      <VerificarClient emailMascarado={emailMascarado} cooldownInicial={cooldownInicial} />
    </div>
  )
}
