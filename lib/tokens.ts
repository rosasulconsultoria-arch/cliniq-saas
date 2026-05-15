import { createHmac } from 'crypto'

const secret = () => process.env.NEXTAUTH_SECRET ?? 'dev-secret-change-in-prod'

export function criarTokenCancelamento(agendamentoId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ id: agendamentoId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })
  ).toString('base64url')
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verificarTokenCancelamento(token: string): string | null {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null
    const expected = createHmac('sha256', secret()).update(payload).digest('base64url')
    if (sig !== expected) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (!data.id || !data.exp || data.exp < Date.now()) return null
    return data.id as string
  } catch {
    return null
  }
}
