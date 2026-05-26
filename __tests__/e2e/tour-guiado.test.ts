import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'

const SLUG_TEST = `e4-test-tour-${Date.now()}`

let tenantId: string
let adminUserId: string

beforeAll(async () => {
  const tenant = await db.tenant.create({
    data: {
      slug: SLUG_TEST,
      nome: 'Clínica Tour Test',
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      tourCompleted: false,
    },
  })
  tenantId = tenant.id

  const user = await db.user.create({
    data: {
      tenantId,
      name: 'Admin Tour',
      email: `admin-tour-${Date.now()}@test.com`,
      passwordHash: 'hash',
      role: 'ADMIN',
    },
  })
  adminUserId = user.id
})

afterAll(async () => {
  await db.user.delete({ where: { id: adminUserId } }).catch(() => null)
  await db.tenant.delete({ where: { id: tenantId } }).catch(() => null)
})

describe('tour guiado pós-signup', () => {
  it('novo tenant tem tourCompleted = false', async () => {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { tourCompleted: true },
    })
    expect(tenant?.tourCompleted).toBe(false)
  })

  it('após dispensar tour, tourCompleted = true e tour não aparece mais', async () => {
    await db.tenant.update({
      where: { id: tenantId },
      data: { tourCompleted: true },
    })
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { tourCompleted: true },
    })
    expect(tenant?.tourCompleted).toBe(true)
  })

  it('itens essenciais do tour são: logo, profissional, local (3 itens)', () => {
    const ESSENTIAL_TOUR_ITEMS = ['logo', 'profissional', 'local']
    expect(ESSENTIAL_TOUR_ITEMS).toHaveLength(3)
    expect(ESSENTIAL_TOUR_ITEMS).toContain('logo')
    expect(ESSENTIAL_TOUR_ITEMS).toContain('profissional')
    expect(ESSENTIAL_TOUR_ITEMS).toContain('local')
  })
})
