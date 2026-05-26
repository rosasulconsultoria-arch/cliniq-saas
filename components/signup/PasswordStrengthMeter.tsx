'use client'

import { calcularForcaSenha, type ForcaSenha } from '@/lib/signup/ui-helpers'

interface PasswordStrengthMeterProps {
  password: string
}

const config: Record<ForcaSenha, { width: string; color: string }> = {
  Fraca: { width: 'w-1/4', color: 'bg-red-500' },
  Média: { width: 'w-2/4', color: 'bg-amber-400' },
  Forte: { width: 'w-3/4', color: 'bg-blue-500' },
  Excelente: { width: 'w-full', color: 'bg-green-500' },
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null
  const forca = calcularForcaSenha(password)
  const { width, color } = config[forca]
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all duration-300 ${width} ${color}`} />
      </div>
      <span className="w-16 text-right text-xs font-medium text-muted-foreground">{forca}</span>
    </div>
  )
}
