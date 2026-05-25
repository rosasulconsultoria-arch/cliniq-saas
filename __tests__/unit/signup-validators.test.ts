import { describe, it, expect, vi } from 'vitest'

// Mock @prisma/client to provide enum values needed by validators.ts
vi.mock('@prisma/client', () => ({
  PlanoTenant: { BASICO: 'BASICO', PRO: 'PRO', ENTERPRISE: 'ENTERPRISE' },
  Periodicidade: { MENSAL: 'MENSAL', ANUAL: 'ANUAL' },
}))

import { clinicaSchema, adminSchema } from '@/lib/signup/validators'

describe('clinicaSchema', () => {
  it('rejeita slug com caracteres especiais', () => {
    const result = clinicaSchema.safeParse({
      nomeClinica: 'Clínica Boa',
      slug: 'clinica_boa!',
      especialidade: 'PSICOLOGIA',
      telefone: '(11) 99999-9999',
    })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.slug).toBeDefined()
  })

  it('rejeita slug muito curto (menos de 3 chars)', () => {
    const result = clinicaSchema.safeParse({
      nomeClinica: 'Clínica Boa',
      slug: 'ab',
      especialidade: 'PSICOLOGIA',
      telefone: '(11) 99999-9999',
    })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.slug).toBeDefined()
  })

  it('aceita slug válido', () => {
    const result = clinicaSchema.safeParse({
      nomeClinica: 'Clínica Boa',
      slug: 'clinica-boa',
      especialidade: 'PSICOLOGIA',
      telefone: '(11) 99999-9999',
    })
    expect(result.success).toBe(true)
  })
})

describe('adminSchema', () => {
  it('rejeita senhas diferentes', () => {
    const result = adminSchema.safeParse({
      nomeAdmin: 'Dr. João',
      emailAdmin: 'joao@clinica.com',
      senha: 'senha123',
      confirmacaoSenha: 'outrasenha',
      termosAceitos: true,
    })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.confirmacaoSenha).toBeDefined()
  })

  it('rejeita sem aceite de termos', () => {
    const result = adminSchema.safeParse({
      nomeAdmin: 'Dr. João',
      emailAdmin: 'joao@clinica.com',
      senha: 'senha123',
      confirmacaoSenha: 'senha123',
      termosAceitos: false,
    })
    expect(result.success).toBe(false)
    // termosAceitos: false should fail (z.literal(true))
  })

  it('aceita dados válidos completos', () => {
    const result = adminSchema.safeParse({
      nomeAdmin: 'Dr. João',
      emailAdmin: 'joao@clinica.com',
      senha: 'senha123',
      confirmacaoSenha: 'senha123',
      termosAceitos: true,
    })
    expect(result.success).toBe(true)
  })
})
