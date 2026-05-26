import { redirect } from 'next/navigation'
import { ProgressIndicator } from '@/components/signup/ProgressIndicator'
import { ClinicaForm } from '@/components/signup/ClinicaForm'
import { getCurrentDraftStatus } from '../actions'

export default async function ClinicaPage() {
  const { draft } = await getCurrentDraftStatus()

  if (!draft?.planoId) {
    redirect('/signup/plano')
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-4">
        <ProgressIndicator currentStep={1} />
        <h1 className="text-2xl font-bold">Identidade da sua clínica</h1>
      </div>
      <ClinicaForm />
    </div>
  )
}
