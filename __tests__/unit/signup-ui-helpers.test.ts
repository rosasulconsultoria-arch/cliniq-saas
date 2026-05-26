import { describe, it, expect, vi } from 'vitest'
import {
  mascararEmail,
  calcularForcaSenha,
  formatarTelefoneBR,
  cooldownVisual,
} from '@/lib/signup/ui-helpers'

describe('mascararEmail', () => {
  it('mascara email com parte local longa', () => {
    expect(mascararEmail('rodrigo@gmail.com')).toBe('r***@gmail.com')
  })

  it('mascara email com parte local curta', () => {
    expect(mascararEmail('ab@example.com')).toBe('a***@example.com')
  })
})

describe('calcularForcaSenha', () => {
  it('retorna Fraca para senha curta', () => {
    expect(calcularForcaSenha('abc')).toBe('Fraca')
  })

  it('retorna Média para senha >= 8 chars sem extras', () => {
    expect(calcularForcaSenha('abcdefgh')).toBe('Média')
  })

  it('retorna Forte para senha com 2 extras', () => {
    expect(calcularForcaSenha('abcdefghAB!')).toBe('Forte')
  })

  it('retorna Excelente para senha com 3+ extras', () => {
    expect(calcularForcaSenha('abcdefghAB12!@')).toBe('Excelente')
  })
})

describe('formatarTelefoneBR', () => {
  it('formata 11 dígitos sem código de país', () => {
    expect(formatarTelefoneBR('11999999999')).toBe('(11) 99999-9999')
  })

  it('formata já formatado (11) 99999-9999', () => {
    expect(formatarTelefoneBR('(11) 99999-9999')).toBe('(11) 99999-9999')
  })

  it('formata com prefixo +55', () => {
    expect(formatarTelefoneBR('+55 11 99999-9999')).toBe('(11) 99999-9999')
  })
})

describe('cooldownVisual', () => {
  it('retorna 0 quando lastSentAt é null', () => {
    expect(cooldownVisual(null)).toBe(0)
  })

  it('retorna 0 quando cooldown já passou', () => {
    const twoMinutesAgo = new Date(Date.now() - 120_000)
    expect(cooldownVisual(twoMinutesAgo)).toBe(0)
  })

  it('retorna segundos restantes dentro do cooldown', () => {
    const thirtySecondsAgo = new Date(Date.now() - 30_000)
    const restante = cooldownVisual(thirtySecondsAgo)
    expect(restante).toBeGreaterThan(0)
    expect(restante).toBeLessThanOrEqual(30)
  })

  it('retorna valor correto para cooldown customizado', () => {
    const fiveSecondsAgo = new Date(Date.now() - 5_000)
    const restante = cooldownVisual(fiveSecondsAgo, 10_000)
    expect(restante).toBeGreaterThan(0)
    expect(restante).toBeLessThanOrEqual(5)
  })
})
