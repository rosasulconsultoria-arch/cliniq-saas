import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { RedefinirSenhaForm } from './form'
import type { Metadata } from 'next'
import { getTenantBySlug } from '@/lib/tenant-lookup'
import { db } from '@/lib/db'

export const metadata: Metadata = { title: 'Redefinir Senha' }

interface Props {
  params: Promise<{ token: string }>
}

export default async function RedefinirSenhaPage({ params }: Props) {
  const { token } = await params
  const slug = (await headers()).get('x-tenant-slug') ?? ''
  const tenant = slug ? await getTenantBySlug(slug) : null
  if (!tenant) notFound()
  const user = await db.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
      tenantId: tenant.id,
    },
    select: { name: true },
  })

  if (!user) notFound()

  return <RedefinirSenhaForm token={token} userName={user.name} />
}
