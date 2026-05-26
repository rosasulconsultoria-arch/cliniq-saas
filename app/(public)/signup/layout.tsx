import { SignupHeader } from '@/components/signup/SignupHeader'

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <SignupHeader />
      <main className="flex flex-1 flex-col items-center px-4 py-10">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
      <footer className="border-t py-5 text-center text-xs text-muted-foreground">
        <span>© {currentYear} [NOME_DO_PRODUTO] · </span>
        <a href="/termos" className="underline-offset-4 hover:underline">
          Termos
        </a>
        <span> · </span>
        <a href="/privacidade" className="underline-offset-4 hover:underline">
          Privacidade
        </a>
      </footer>
    </div>
  )
}
