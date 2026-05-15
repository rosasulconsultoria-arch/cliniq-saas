import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') redirect('/dashboard')
  return session
}

// Lança erro em vez de redirect — usar em Server Actions
export async function assertAdmin(): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Acesso não autorizado: requer role ADMIN')
  }
}

export async function assertAuth(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Não autenticado')
  return session.user.id
}

export async function getProfissionalIdDoUsuario(): Promise<string | null> {
  const session = await auth()
  if (!session?.user) return null
  if (session.user.role !== 'PROFISSIONAL') return null

  const { db } = await import('@/lib/db')
  const prof = await db.profissional.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  return prof?.id ?? null
}
