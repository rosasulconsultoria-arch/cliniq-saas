export function mascararEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const masked = local.length <= 2 ? local[0] + '***' : local[0] + '***'
  return `${masked}@${domain}`
}

export type ForcaSenha = 'Fraca' | 'Média' | 'Forte' | 'Excelente'

export function calcularForcaSenha(senha: string): ForcaSenha {
  if (senha.length < 8) return 'Fraca'
  let score = 0
  if (senha.length >= 12) score++
  if (/[A-Z]/.test(senha)) score++
  if (/[0-9]/.test(senha)) score++
  if (/[^A-Za-z0-9]/.test(senha)) score++
  if (score <= 1) return 'Média'
  if (score === 2) return 'Forte'
  return 'Excelente'
}

export function formatarTelefoneBR(telefone: string): string {
  const digits = telefone.replace(/\D/g, '').replace(/^55/, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return telefone
}

export function cooldownVisual(lastSentAt: Date | null, cooldownMs = 60_000): number {
  if (!lastSentAt) return 0
  const elapsed = Date.now() - lastSentAt.getTime()
  if (elapsed >= cooldownMs) return 0
  return Math.ceil((cooldownMs - elapsed) / 1000)
}
