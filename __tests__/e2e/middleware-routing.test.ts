import { describe, it, expect } from 'vitest'
import { isRotaPublica } from '@/lib/public-routes'

// Testa a lista canônica de rotas públicas usada pelo middleware.
// Importa diretamente de lib/public-routes para garantir que mudanças
// no middleware quebram esses testes — não é uma cópia inline da lógica.

describe('middleware routing — rotas públicas (sem auth)', () => {
  it('/signup/plano é pública', () => {
    expect(isRotaPublica('/signup/plano')).toBe(true)
  })

  it('/signup/clinica é pública', () => {
    expect(isRotaPublica('/signup/clinica')).toBe(true)
  })

  it('/signup/admin é pública', () => {
    expect(isRotaPublica('/signup/admin')).toBe(true)
  })

  it('/signup/verificar é pública', () => {
    expect(isRotaPublica('/signup/verificar')).toBe(true)
  })

  it('/signup/cartao é pública', () => {
    expect(isRotaPublica('/signup/cartao')).toBe(true)
  })

  it('/signup/sucesso é pública', () => {
    expect(isRotaPublica('/signup/sucesso')).toBe(true)
  })

  it('/cancelar/qualquer-token é pública', () => {
    expect(isRotaPublica('/cancelar/abc123')).toBe(true)
  })

  it('/termos é pública', () => {
    expect(isRotaPublica('/termos')).toBe(true)
  })

  it('/privacidade é pública', () => {
    expect(isRotaPublica('/privacidade')).toBe(true)
  })

  it('/agendar/slug é pública', () => {
    expect(isRotaPublica('/agendar/dr-silva')).toBe(true)
  })

  it('/login é pública', () => {
    expect(isRotaPublica('/login')).toBe(true)
  })

  it('/esqueci-senha é pública', () => {
    expect(isRotaPublica('/esqueci-senha')).toBe(true)
  })

  it('/redefinir-senha/token é pública', () => {
    expect(isRotaPublica('/redefinir-senha/abc123')).toBe(true)
  })
})

describe('middleware routing — rotas privadas (exigem auth)', () => {
  it('/dashboard requer auth', () => {
    expect(isRotaPublica('/dashboard')).toBe(false)
  })

  it('/ raiz requer auth', () => {
    expect(isRotaPublica('/')).toBe(false)
  })

  it('/pacientes requer auth', () => {
    expect(isRotaPublica('/pacientes')).toBe(false)
  })

  it('/financeiro requer auth', () => {
    expect(isRotaPublica('/financeiro')).toBe(false)
  })

  it('/configuracoes requer auth', () => {
    expect(isRotaPublica('/configuracoes')).toBe(false)
  })

  it('/billing/upgrade requer auth (mas bypassa billing check)', () => {
    expect(isRotaPublica('/billing/upgrade')).toBe(false)
  })
})
