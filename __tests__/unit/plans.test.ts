import { describe, it, expect, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), unstable_cache: vi.fn((fn) => fn) }))
vi.mock('@/lib/db', () => ({ db: { tenant: { findUniqueOrThrow: vi.fn() } } }))

import {
  getPlan,
  getAllPlans,
  canUseFeature,
  getLimit,
  checkLimit,
  getPriceDisplay,
  PLANOS,
} from '@/lib/plans'

describe('getPlan', () => {
  it('retorna config correta para cada plano', () => {
    expect(getPlan('BASICO').nome).toBe('Básico')
    expect(getPlan('PROFISSIONAL').nome).toBe('Profissional')
    expect(getPlan('ENTERPRISE').nome).toBe('Enterprise')
  })

  it('retorna o mesmo objeto que PLANOS', () => {
    expect(getPlan('BASICO')).toBe(PLANOS.BASICO)
    expect(getPlan('PROFISSIONAL')).toBe(PLANOS.PROFISSIONAL)
    expect(getPlan('ENTERPRISE')).toBe(PLANOS.ENTERPRISE)
  })
})

describe('getAllPlans', () => {
  it('retorna 3 planos na ordem correta', () => {
    const plans = getAllPlans()
    expect(plans).toHaveLength(3)
    expect(plans[0].id).toBe('BASICO')
    expect(plans[1].id).toBe('PROFISSIONAL')
    expect(plans[2].id).toBe('ENTERPRISE')
  })
})

describe('canUseFeature', () => {
  it('BASICO não tem features avançadas', () => {
    expect(canUseFeature('BASICO', 'taxasImpostos')).toBe(false)
    expect(canUseFeature('BASICO', 'alugueis')).toBe(false)
    expect(canUseFeature('BASICO', 'whatsapp')).toBe(false)
    expect(canUseFeature('BASICO', 'relatoriosAvancados')).toBe(false)
  })

  it('PROFISSIONAL tem features intermediárias', () => {
    expect(canUseFeature('PROFISSIONAL', 'taxasImpostos')).toBe(true)
    expect(canUseFeature('PROFISSIONAL', 'alugueis')).toBe(true)
    expect(canUseFeature('PROFISSIONAL', 'whatsapp')).toBe(true)
    // features exclusivas Enterprise devem ser false
    expect(canUseFeature('PROFISSIONAL', 'mapaPacientes')).toBe(false)
    expect(canUseFeature('PROFISSIONAL', 'onboardingAssistido')).toBe(false)
  })

  it('ENTERPRISE tem todas as features (exceto apiPublica que é Em breve)', () => {
    expect(canUseFeature('ENTERPRISE', 'mapaPacientes')).toBe(true)
    expect(canUseFeature('ENTERPRISE', 'multiTenantPaiFilho')).toBe(true)
    expect(canUseFeature('ENTERPRISE', 'onboardingAssistido')).toBe(true)
    expect(canUseFeature('ENTERPRISE', 'treinamentoEquipe')).toBe(true)
    expect(canUseFeature('ENTERPRISE', 'apiPublica')).toBe(false)
  })
})

describe('getLimit', () => {
  it('retorna número para limites finitos', () => {
    expect(getLimit('BASICO', 'profissionais')).toBe(1)
    expect(getLimit('BASICO', 'agendamentosMes')).toBe(200)
    expect(getLimit('BASICO', 'locais')).toBe(10)
    expect(getLimit('PROFISSIONAL', 'profissionais')).toBe(10)
    expect(getLimit('PROFISSIONAL', 'locais')).toBe(20)
  })

  it('retorna ilimitado para limites sem teto', () => {
    expect(getLimit('BASICO', 'pacientes')).toBe('ilimitado')
    expect(getLimit('PROFISSIONAL', 'agendamentosMes')).toBe('ilimitado')
    expect(getLimit('ENTERPRISE', 'profissionais')).toBe('ilimitado')
    expect(getLimit('ENTERPRISE', 'locais')).toBe('ilimitado')
  })
})

describe('checkLimit', () => {
  it('limite ilimitado → sempre allowed=true', () => {
    const result = checkLimit('BASICO', 'pacientes', 99999)
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe('ilimitado')
    expect(result.message).toBeUndefined()
  })

  it('currentCount abaixo do limite → allowed=true', () => {
    const result = checkLimit('BASICO', 'locais', 5)
    expect(result.allowed).toBe(true)
    expect(result.current).toBe(5)
    expect(result.limit).toBe(10)
    expect(result.message).toBeUndefined()
  })

  it('currentCount igual ao limite → allowed=false', () => {
    const result = checkLimit('BASICO', 'locais', 10)
    expect(result.allowed).toBe(false)
    expect(result.current).toBe(10)
    expect(result.limit).toBe(10)
    expect(result.message).toBeDefined()
  })

  it('currentCount acima do limite (estado inconsistente) → allowed=false', () => {
    const result = checkLimit('BASICO', 'locais', 15)
    expect(result.allowed).toBe(false)
    expect(result.current).toBe(15)
  })

  it('message inclui nome do plano e limite ao bloquear', () => {
    const result = checkLimit('BASICO', 'locais', 10)
    expect(result.message).toContain('Básico')
    expect(result.message).toContain('10')
    expect(result.message).toContain('locais')
  })

  it('PROFISSIONAL profissionais: 9 → ok, 10 → bloqueado', () => {
    expect(checkLimit('PROFISSIONAL', 'profissionais', 9).allowed).toBe(true)
    expect(checkLimit('PROFISSIONAL', 'profissionais', 10).allowed).toBe(false)
  })
})

describe('getPriceDisplay — mensal', () => {
  it('cobrancaTotal === mensalEquivalente, sem savings', () => {
    const result = getPriceDisplay('BASICO', 'mensal')
    expect(result.mensalEquivalente).toBe(9700)
    expect(result.cobrancaTotal).toBe(9700)
    expect(result.savingsAnual).toBeUndefined()
    expect(result.savingsPercentual).toBeUndefined()
    expect(result.parcelas12xSemJuros).toBeUndefined()
  })

  it('PROFISSIONAL mensal correto', () => {
    const result = getPriceDisplay('PROFISSIONAL', 'mensal')
    expect(result.mensalEquivalente).toBe(19700)
    expect(result.cobrancaTotal).toBe(19700)
  })
})

describe('getPriceDisplay — anual', () => {
  it('BASICO anual: savings ~15%, parcelas corretas', () => {
    const result = getPriceDisplay('BASICO', 'anual')
    // mensalEquivalente do plano anual: 8245
    expect(result.mensalEquivalente).toBe(8245)
    // cobrancaTotal = 98940
    expect(result.cobrancaTotal).toBe(98940)
    // savingsAnual = 9700*12 - 98940 = 116400 - 98940 = 17460
    expect(result.savingsAnual).toBe(17460)
    // savingsPercentual = round(17460 / 116400 * 100) = round(15.0) = 15
    expect(result.savingsPercentual).toBe(15)
    // parcelas12x = round(98940 / 12) = 8245
    expect(result.parcelas12xSemJuros).toBe(8245)
  })

  it('PROFISSIONAL anual: savings ~20%', () => {
    const result = getPriceDisplay('PROFISSIONAL', 'anual')
    // savingsAnual = 19700*12 - 189120 = 236400 - 189120 = 47280
    expect(result.savingsAnual).toBe(47280)
    // savingsPercentual = round(47280 / 236400 * 100) = round(20.0) = 20
    expect(result.savingsPercentual).toBe(20)
    expect(result.parcelas12xSemJuros).toBe(Math.round(189120 / 12))
  })

  it('ENTERPRISE anual: savings ~20%', () => {
    const result = getPriceDisplay('ENTERPRISE', 'anual')
    // savingsAnual = 49700*12 - 477120 = 596400 - 477120 = 119280
    expect(result.savingsAnual).toBe(119280)
    // savingsPercentual = round(119280 / 596400 * 100) = round(20.0) = 20
    expect(result.savingsPercentual).toBe(20)
  })
})
