import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verificarEmailToken } from '../../actions'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface TokenPageProps {
  params: Promise<{ token: string }>
}

export default async function TokenPage({ params }: TokenPageProps) {
  const { token } = await params
  const result = await verificarEmailToken(token)

  if (result.success) {
    redirect('/signup/sucesso-temporario')
  }

  if (result.error === 'used') {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <CheckCircle className="h-10 w-10 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">Link já utilizado</h1>
          <p className="text-muted-foreground">
            Sua conta já foi verificada. Siga para a próxima etapa.
          </p>
        </div>
        <Button asChild>
          <Link href="/signup/sucesso-temporario">Continuar</Link>
        </Button>
      </div>
    )
  }

  if (result.error === 'expired') {
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
