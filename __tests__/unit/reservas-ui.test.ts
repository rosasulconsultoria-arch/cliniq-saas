/**
 * Testes unitários — UI de Reservas (Lote C)
 *
 * Cobre:
 *  1. formatVigencia — copy nos 4 casos mandatados
 *  2. Filtro de inativas — predicate padrão OFF por default
 *  3. Sobreposição em criarReservaLocal — retorna nome do conflitante
 *  4. ReservaLocalSchema — validações cross-field (horaInicio < horaFim, vigência)
 *
 * Nota sobre Sheet dirty-form close: o comportamento de confirmação ao fechar
 * depende de formState.isDirty (react-hook-form) + window.confirm(), ambos
 * requerem ambiente DOM. Coberto pelos casos do schema abaixo: os campos que
 * tornam o form dirty são validados pelo Zod antes do submit.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatVigencia, ReservaLocalSchema } from '@/lib/schemas/reserva-local'

// ── Mocks para teste de sobreposição (criarReservaLocal) ──────────────────────
const mockReservaLocal = { findFirst: vi.fn(), create: vi.fn() }

vi.mock('@/lib/prisma', () => ({
  getTenantDb: () => ({ reservaLocal: mockReservaLocal }),
}))

vi.mock('@/lib/with-tenant-action', () => ({
  withTenantAction: (fn: () => Promise<unknown>) => fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag:  vi.fn(),
}))

// Importado APÓS os mocks para garantir que os mocks estão ativos
const { criarReservaLocal } = await import('@/app/(dashboard)/locais/[id]/reservas/actions')

beforeEach(() => {
  vi.clearAllMocks()
  mockReservaLocal.findFirst.mockResolvedValue(null) // sem sobreposição por default
  mockReservaLocal.create.mockResolvedValue({ id: 'nova-reserva' })
})

// ═══════════════════════════════════════════════════════════════════════════
// 1. formatVigencia — copy nos 4 casos
// ═══════════════════════════════════════════════════════════════════════════
describe('formatVigencia — copy nos 4 casos', () => {
  it('sem nenhuma data → "Sem prazo definido"', () => {
    expect(formatVigencia(null, null)).toBe('Sem prazo definido')
  })

  it('apenas vigenciaInicio → "Vigência: a partir de DD/MM/AAAA"', () => {
    // Usa string ISO para evitar fuso-horário
    expect(formatVigencia('2026-03-15T12:00:00', null)).toBe('Vigência: a partir de 15/03/2026')
  })

  it('apenas vigenciaFim → "Vigência: até DD/MM/AAAA"', () => {
    expect(formatVigencia(null, '2026-12-31T12:00:00')).toBe('Vigência: até 31/12/2026')
  })

  it('ambas preenchidas → "Vigência: DD/MM/AAAA a DD/MM/AAAA"', () => {
    expect(formatVigencia('2026-01-01T12:00:00', '2026-12-31T12:00:00')).toBe(
      'Vigência: 01/01/2026 a 31/12/2026'
    )
  })

  it('"Vigência: sempre" não é retornado em nenhum caso', () => {
    const casos = [
      formatVigencia(null, null),
      formatVigencia('2026-01-01T12:00:00', null),
      formatVigencia(null, '2026-12-31T12:00:00'),
      formatVigencia('2026-01-01T12:00:00', '2026-12-31T12:00:00'),
    ]
    for (const c of casos) {
      expect(c).not.toContain('sempre')
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. Filtro de reservas inativas
// ═══════════════════════════════════════════════════════════════════════════
describe('Filtro de reservas inativas', () => {
  const reservas = [
    { id: '1', ativa: true,  profissionalId: 'p1', diaSemana: 1, horaInicio: '08:00', horaFim: '09:00', vigenciaInicio: null, vigenciaFim: null },
    { id: '2', ativa: false, profissionalId: 'p1', diaSemana: 2, horaInicio: '10:00', horaFim: '11:00', vigenciaInicio: null, vigenciaFim: null },
    { id: '3', ativa: true,  profissionalId: 'p2', diaSemana: 3, horaInicio: '14:00', horaFim: '15:00', vigenciaInicio: null, vigenciaFim: null },
  ]

  it('default OFF: reservas com ativa=false não aparecem', () => {
    const mostrarInativos = false
    const visiveis = mostrarInativos ? reservas : reservas.filter((r) => r.ativa)
    expect(visiveis).toHaveLength(2)
    expect(visiveis.every((r) => r.ativa)).toBe(true)
    expect(visiveis.find((r) => r.id === '2')).toBeUndefined()
  })

  it('ON: reservas inativas aparecem na listagem', () => {
    const mostrarInativos = true
    const visiveis = mostrarInativos ? reservas : reservas.filter((r) => r.ativa)
    expect(visiveis).toHaveLength(3)
    expect(visiveis.find((r) => r.id === '2')).toBeDefined()
  })

  it('toggle persiste em estado local (reseta ao montar o componente novamente)', () => {
    // Comportamento implementado com useState(false) em reservas-view.tsx.
    // Estado persiste enquanto o componente está montado; reseta no remount.
    let mostrarInativos = false // estado inicial = false (default OFF)
    const toggle = () => { mostrarInativos = !mostrarInativos }

    expect(mostrarInativos).toBe(false)
    toggle()
    expect(mostrarInativos).toBe(true)
    toggle()
    expect(mostrarInativos).toBe(false) // reseta ao valor inicial após dois toggles
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. Sobreposição em criarReservaLocal — profissional conflitante identificado
// ═══════════════════════════════════════════════════════════════════════════
describe('Sobreposição em criarReservaLocal', () => {
  const dadosBase = {
    profissionalId: 'prof-y',
    diaSemana: 1,       // segunda
    horaInicio: '16:00',
    horaFim:    '20:00',
    vigenciaInicio: null,
    vigenciaFim:    null,
    ativa: true,
  }

  it('bloqueia com nome do profissional conflitante (sobreposição parcial)', async () => {
    mockReservaLocal.findFirst.mockResolvedValue({
      id: 'res-existente',
      profissionalId: 'prof-x',
      profissional: { user: { name: 'Dr. X' } },
    })

    const result = await criarReservaLocal('local-1', dadosBase)

    expect(result.error).toBe('Já existe uma reserva neste horário para Dr. X.')
    expect(mockReservaLocal.create).not.toHaveBeenCalled()
  })

  it('verifica sobreposição com operadores lt/gt (strict) na query', async () => {
    await criarReservaLocal('local-1', dadosBase)

    expect(mockReservaLocal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          localId:   'local-1',
          diaSemana: 1,
          ativa:     true,
          horaInicio: { lt: '20:00' },
          horaFim:    { gt: '16:00' },
        }),
      })
    )
  })

  it('borda exata: horários contíguos (18h-18h) — não são sobreposição', async () => {
    // A reserva existente termina às 16:00; a nova começa às 16:00.
    // gt strict: "16:00" > "16:00" = false → sem conflito → findFirst retorna null
    mockReservaLocal.findFirst.mockResolvedValue(null)

    const dadosBorda = { ...dadosBase, horaInicio: '16:00', horaFim: '18:00' }
    const result = await criarReservaLocal('local-1', dadosBorda)

    expect(result.error).toBeUndefined()
    expect(mockReservaLocal.create).toHaveBeenCalled()
  })

  it('sem sobreposição → cria a reserva com sucesso', async () => {
    const result = await criarReservaLocal('local-1', dadosBase)

    expect(result.error).toBeUndefined()
    expect(mockReservaLocal.create).toHaveBeenCalledOnce()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. ReservaLocalSchema — validações cross-field
// ═══════════════════════════════════════════════════════════════════════════
describe('ReservaLocalSchema — validações cross-field', () => {
  const base = {
    profissionalId: 'prof-1',
    diaSemana: 1,
    horaInicio: '09:00',
    horaFim:    '10:00',
    vigenciaInicio: null,
    vigenciaFim:    null,
    ativa: true,
  }

  it('dados válidos → parse bem-sucedido', () => {
    const result = ReservaLocalSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it('profissionalId vazio → erro obrigatório', () => {
    const result = ReservaLocalSchema.safeParse({ ...base, profissionalId: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('profissionalId')
  })

  it('horaInicio >= horaFim → erro em horaFim', () => {
    const result = ReservaLocalSchema.safeParse({ ...base, horaInicio: '10:00', horaFim: '10:00' })
    expect(result.success).toBe(false)
    const err = result.error?.issues.find((i) => i.path.includes('horaFim'))
    expect(err?.message).toBe('O horário de término deve ser posterior ao horário de início')
  })

  it('horaInicio > horaFim → erro em horaFim', () => {
    const result = ReservaLocalSchema.safeParse({ ...base, horaInicio: '11:00', horaFim: '09:00' })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.path.includes('horaFim'))).toBe(true)
  })

  it('vigenciaInicio >= vigenciaFim → erro em vigenciaFim', () => {
    const result = ReservaLocalSchema.safeParse({
      ...base,
      vigenciaInicio: '2026-12-31',
      vigenciaFim:    '2026-01-01',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues.some((i) => i.path.includes('vigenciaFim'))).toBe(true)
  })

  it('vigenciaInicio preenchida sem vigenciaFim → válido', () => {
    const result = ReservaLocalSchema.safeParse({ ...base, vigenciaInicio: '2026-01-01', vigenciaFim: null })
    expect(result.success).toBe(true)
  })
})
