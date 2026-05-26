import { redirect } from 'next/navigation'
import { getCurrentDraftStatus } from '../actions'
import { PLANOS } from '@/lib/plans'
import { CartaoForm } from './CartaoForm'
import { ProgressIndicator } from '@/components/signup/ProgressIndicator'

export default async function CartaoPage() {
  const { draft } = await getCurrentDraftStatus()

  if (!draft) redirect('/signup/plano')
  if (!draft.emailVerificado) redirect('/signup/verificar')
  if (draft.finalized) redirect('/signup/sucesso')
  if (!draft.planoId || !draft.periodicidade) redirect('/signup/plano')

  const plano = PLANOS[draft.planoId]
  const periodicidade = draft.periodicidade as 'MENSAL' | 'ANUAL'

  const valueCents =
    periodicidade === 'ANUAL' ? plano.precos.anual.cents : plano.precos.mensal.cents
  const valorFormatado = (valueCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 14)
  const trialEndFormatado = trialEnd.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const parcelas12x =
    periodicidade === 'ANUAL'
      ? (plano.precos.anual.cents / 12 / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : null

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-4">
        <ProgressIndicator currentStep={3} />
        <h1 className="text-2xl font-bold tracking-tight">Dados de pagamento</h1>
        <p className="text-center text-sm text-muted-foreground">
          Seu trial de 14 dias começa agora. Nenhuma cobrança até {trialEndFormatado}.
        </p>
      </div>

      {/* Resumo da compra */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Resumo da assinatura
        </h2>
        <div className="flex items-center justify-between">
          <span className="font-medium">Plano {plano.nome}</span>
          <span className="text-sm text-muted-foreground">
            {periodicidade === 'ANUAL' ? 'Anual' : 'Mensal'}
          </span>
        </div>
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Hoje</span>
            <span className="font-semibold text-emerald-600">R$ 0,00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              1ª cobrança em {trialEndFormatado}
            </span>
            <span className="font-semibold">{valorFormatado}</span>
          </div>
          {parcelas12x && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Ou 12× sem juros de</span>
              <span>{parcelas12x}</span>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cancele antes de {trialEndFormatado} e não cobramos nada.
        </p>
      </div>

      <CartaoForm nomePlano={plano.nome} valorFormatado={valorFormatado} />
    </div>
  )
}
