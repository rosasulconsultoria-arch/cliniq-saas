import { redirect } from 'next/navigation'
import { getCurrentDraftStatus } from './actions'

export default async function SignupPage() {
  const { draft } = await getCurrentDraftStatus()

  if (!draft) {
    redirect('/signup/plano')
  }

  if (draft.finalized) {
    redirect('/signup/sucesso-temporario')
  }

  if (draft.emailVerificado) {
    redirect('/signup/sucesso-temporario')
  }

  if (draft.step >= 2 && draft.emailAdmin) {
    redirect('/signup/verificar')
  }

  if (draft.step >= 1 && draft.nomeClinica && draft.slug) {
    redirect('/signup/admin')
  }

  if (draft.planoId) {
    redirect('/signup/clinica')
  }

  redirect('/signup/plano')
}
