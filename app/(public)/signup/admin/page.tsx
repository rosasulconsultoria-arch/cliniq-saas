import { redirect } from 'next/navigation'
import { ProgressIndicator } from '@/components/signup/ProgressIndicator'
import { AdminForm } from '@/components/signup/AdminForm'
import { getCurrentDraftStatus } from '../actions'

export default async function AdminPage() {
  const { draft } = await getCurrentDraftStatus()

  if (!draft?.planoId) {
    redirect('/signup/plano')
  }

  if (!draft.nomeClinica || !draft.slug) {
    redirect('/signup/clinica')
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-4">
        <ProgressIndicator currentStep={2} />
        <h1 className="text-2xl font-bold">Dados do administrador</h1>
      </div>
      <AdminForm />
    </div>
  )
}
