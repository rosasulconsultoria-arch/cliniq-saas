import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AtualizarCartaoForm } from './AtualizarCartaoForm'

export default function AtualizarCartaoPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/billing"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Atualizar cartão</h1>
        <p className="text-muted-foreground text-sm mt-1">
          O novo cartão será usado para a próxima cobrança.
        </p>
      </div>

      <AtualizarCartaoForm />
    </div>
  )
}
