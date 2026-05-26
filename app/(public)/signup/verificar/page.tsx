import { redirect } from 'next/navigation'
import { ProgressIndicator } from '@/components/signup/ProgressIndicator'
import { VerificarClient } from './VerificarClient'
import { getCurrentDraftStatus } from '../actions'
import { mascararEmail, cooldownVisual } from '@/lib/signup/ui-helpers'

export default async function VerificarPage() {
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
