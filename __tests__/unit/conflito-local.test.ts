import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validarConflitoAgendamento } from '@/lib/agendamento'

// ── Mock do getTenantDb ────────────────────────────────────────────────────
const mockAgendamento = { findFirst: vi.fn() }
const mockLocal       = { findFirst: vi.fn() }
const mockReservaLocal = { findFirst: vi.fn() }

vi.mock('@/lib/prisma', () => ({
  getTenantDb: () => ({
    agendamento:  mockAgendamento,
    local:        mockLocal,
    reservaLocal: mockReservaLocal,
  }),
}))

// ── Helpers ────────────────────────────────────────────────────────────────

/** Data fixa numa quarta-feira (dia 3) para facilitar asserções de diaSemana */
function makeDate(hour: number, minute = 0): Date {
  return new Date(2026, 5, 10, hour, minute, 0) // quarta-feira
}

const PROF_A  = 'prof-a'
const PROF_B  = 'prof-b'
const LOCAL_ID = 'local-1'

beforeEach(() => {
  vi.clearAllMocks()
  // Por padrão: sem conflitos
  mockAgendamento.findFirst.mockResolvedValue(null)
  mockReservaLocal.findFirst.mockResolvedValue(null)
})

// ═══════════════════════════════════════════════════════════════════════════
// 1. Conflito de profissional
// ═══════════════════════════════════════════════════════════════════════════
describe('Conflito de profissional', () => {
  it('bloqueia quando profissional já tem agendamento no horário', async () => {
    mockLocal.findFirst.mockResolvedValue({ tipo: 'SALA' })
    mockAgendamento.findFirst.mockResolvedValueOnce({ id: 'ag-existente' }) // conflito prof

    const res = await validarConflitoAgendamento(PROF_A, LOCAL_ID, makeDate(10), makeDate(11))

    expect(res).toEqual({ ok: false, motivo: 'Profissional já tem agendamento nesse horário' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 2. Local SALA — conflito padrão de agendamento
// ═══════════════════════════════════════════════════════════════════════════
describe('Local SALA — sem reserva ativa', () => {
  it('bloqueia quando há agendamento sobreposto no local', async () => {
    mockLocal.findFirst.mockResolvedValue({ tipo: 'SALA' })
    mockAgendamento.findFirst
      .mockResolvedValueOnce(null)              // sem conflito de profissional
      .mockResolvedValueOnce({ id: 'ag-local' }) // conflito de local

    const res = await validarConflitoAgendamento(PROF_A, LOCAL_ID, makeDate(10), makeDate(11))

    expect(res).toEqual({ ok: false, motivo: 'Local já está ocupado nesse horário' })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 3. Local SALA — reserva ativa de outro profissional
// ═══════════════════════════════════════════════════════════════════════════
describe('Local SALA — com reserva ativa', () => {
  it('bloqueia quando reserva pertence a outro profissional', async () => {
    mockLocal.findFirst.mockResolvedValue({ tipo: 'SALA' })
    mockReservaLocal.findFirst.mockResolvedValue({ id: 'res-1', profissionalId: PROF_B })

    const res = await validarConflitoAgendamento(PROF_A, LOCAL_ID, makeDate(14), makeDate(15))

    expect(res).toEqual({ ok: false, motivo: 'Local reservado para outro profissional neste horário' })
  })

  it('permite quando reserva pertence ao próprio profissional', async () => {
    mockLocal.findFirst.mockResolvedValue({ tipo: 'SALA' })
    mockReservaLocal.findFirst.mockResolvedValue({ id: 'res-1', profissionalId: PROF_A })

    const res = await validarConflitoAgendamento(PROF_A, LOCAL_ID, makeDate(14), makeDate(15))

    expect(res).toEqual({ ok: true })
  })

  it('ignora reserva expirada e valida padrão (sem conflito de agendamento → ok)', async () => {
    mockLocal.findFirst.mockResolvedValue({ tipo: 'SALA' })
    // reservaLocal.findFirst retorna null (vigenciaFim expirada filtrada pela query)
    mockReservaLocal.findFirst.mockResolvedValue(null)

    const res = await validarConflitoAgendamento(PROF_A, LOCAL_ID, makeDate(14), makeDate(15))

    expect(res).toEqual({ ok: true })
    // Deve ter verificado conflito padrão de local (2ª chamada de findFirst)
    expect(mockAgendamento.findFirst).toHaveBeenCalledTimes(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 4. Local ONLINE e DOMICILIAR — nunca valida conflito de local
// ═══════════════════════════════════════════════════════════════════════════
describe('Local ONLINE e DOMICILIAR', () => {
  it('permite agendamento sobreposto em local ONLINE', async () => {
    mockLocal.findFirst.mockResolvedValue({ tipo: 'ONLINE' })

    const res = await validarConflitoAgendamento(PROF_A, LOCAL_ID, makeDate(10), makeDate(11))

    expect(res).toEqual({ ok: true })
    expect(mockReservaLocal.findFirst).not.toHaveBeenCalled()
  })

  it('permite agendamento sobreposto em local DOMICILIAR', async () => {
    mockLocal.findFirst.mockResolvedValue({ tipo: 'DOMICILIAR' })

    const res = await validarConflitoAgendamento(PROF_A, LOCAL_ID, makeDate(10), makeDate(11))

    expect(res).toEqual({ ok: true })
    expect(mockReservaLocal.findFirst).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 5. Dia da semana correto para reserva
// ═══════════════════════════════════════════════════════════════════════════
describe('diaSemana da reserva', () => {
  it('não aplica reserva de outro dia (mock retorna null → fallback padrão → ok)', async () => {
    mockLocal.findFirst.mockResolvedValue({ tipo: 'SALA' })
    // diaSemana diferente → query não retorna reserva
    mockReservaLocal.findFirst.mockResolvedValue(null)

    const res = await validarConflitoAgendamento(PROF_A, LOCAL_ID, makeDate(10), makeDate(11))

    expect(res).toEqual({ ok: true })
    // Verifica que a query foi chamada com o diaSemana correto (3 = quarta)
    expect(mockReservaLocal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ diaSemana: 3 }) })
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// 6. Sobreposição parcial e de borda
// ═══════════════════════════════════════════════════════════════════════════
describe('Sobreposição de intervalos de hora', () => {
  it('sobreposição parcial: reserva 14h-18h, agendamento 17h-19h → bloqueia', async () => {
    mockLocal.findFirst.mockResolvedValue({ tipo: 'SALA' })
    mockReservaLocal.findFirst.mockResolvedValue({ id: 'res-1', profissionalId: PROF_B })

    const res = await validarConflitoAgendamento(PROF_A, LOCAL_ID, makeDate(17), makeDate(19))

    expect(res).toEqual({ ok: false, motivo: 'Local reservado para outro profissional neste horário' })
    // Confirma operadores lt/gt (strict) na query de sobreposição
    expect(mockReservaLocal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          horaInicio: { lt: '19:00' },
          horaFim:    { gt: '17:00' },
        }),
      })
    )
  })

  it('borda exata: reserva 14h-18h, agendamento 18h-19h → não é conflito (gt strict)', async () => {
    mockLocal.findFirst.mockResolvedValue({ tipo: 'SALA' })
    // Mock com gt strict: "18:00" > "18:00" é false → findFirst retornaria null no DB real
    mockReservaLocal.findFirst.mockResolvedValue(null)

    const res = await validarConflitoAgendamento(PROF_A, LOCAL_ID, makeDate(18), makeDate(19))

    expect(res).toEqual({ ok: true })
    // Confirma que a query usa gt (não gte) para horaFim
    expect(mockReservaLocal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          horaFim: { gt: '18:00' },
        }),
      })
    )
  })
})
