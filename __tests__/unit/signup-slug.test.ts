import { describe, it, expect } from 'vitest'
import { slugify, generateSlugSuggestions, isReservedSlug } from '@/lib/signup/slug'

describe('slugify', () => {
  it('normaliza acentos: "Clínica São José" → "clinica-sao-jose"', () => {
    expect(slugify('Clínica São José')).toBe('clinica-sao-jose')
  })

  it('remove caracteres especiais e múltiplos hífens', () => {
    const result = slugify('Clínica  --  ABC!!!')
    expect(result).toBe('clinica-abc')
  })
})

describe('generateSlugSuggestions', () => {
  it('retorna 3 alternativas livres', () => {
    const suggestions = generateSlugSuggestions('minha-clinica', [])
    expect(suggestions).toHaveLength(3)
    suggestions.forEach((s) => expect(typeof s).toBe('string'))
    suggestions.forEach((s) => expect(s).not.toBe('minha-clinica'))
  })

  it('exclui slugs já ocupados das sugestões', () => {
    const occupied = ['minha-clinica-2', 'minha-clinica-3', 'minha-clinica-4']
    const suggestions = generateSlugSuggestions('minha-clinica', occupied)
    suggestions.forEach((s) => expect(occupied).not.toContain(s))
  })
})

describe('isReservedSlug', () => {
  it('detecta slugs reservados corretamente', () => {
    expect(isReservedSlug('admin')).toBe(true)
    expect(isReservedSlug('api')).toBe(true)
    expect(isReservedSlug('login')).toBe(true)
    expect(isReservedSlug('dashboard')).toBe(true)
  })

  it('permite slugs não reservados', () => {
    expect(isReservedSlug('minha-clinica')).toBe(false)
    expect(isReservedSlug('centro-de-saude')).toBe(false)
  })
})
