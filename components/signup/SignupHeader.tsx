import Link from 'next/link'

export function SignupHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-primary">
          [NOME_DO_PRODUTO]
        </Link>
        <Link
          href="/login"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Já tem conta?{' '}
          <span className="font-medium text-primary underline-offset-4 hover:underline">
            Entrar
          </span>
        </Link>
      </div>
    </header>
  )
}
