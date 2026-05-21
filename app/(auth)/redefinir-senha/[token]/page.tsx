import { getTenantDb } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { RedefinirSenhaForm } from './form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Redefinir Senha' }

interface Props {
  params: Promise<{ token: string }>
}

export default async function RedefinirSenhaPage({ params }: Props) {
  const { token } = await params
  const db = getTenantDb()
  const user = await db.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
    select: { name: true },
  })

  if (!user) notFound()

  return <RedefinirSenhaForm token={token} userName={user.name} />
}
