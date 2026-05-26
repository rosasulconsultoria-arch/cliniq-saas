import { CheckCircle } from 'lucide-react'

export default function SucessoTemporarioPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Email verificado com sucesso!</h1>
        <p className="max-w-sm text-muted-foreground">
          A próxima etapa — informações de pagamento e ativação do trial — será implementada em
          breve.
        </p>
      </div>
    </div>
  )
}
