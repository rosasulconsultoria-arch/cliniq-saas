import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { TrocarSenhaForm } from './form'

export default async function TrocarSenhaPage() {
  const session = await auth()

  if (!session?.user) redirect('/login')
  if (!session.user.mustChangePassword) redirect('/dashboard')

  return <TrocarSenhaForm />
}
