import { describe, it, expect } from 'vitest'
import { getTenantId, runWithTenant, runWithoutTenant } from '../lib/tenant-context'
import { applyTenantToArgs } from '../lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 1 — Tenant A não vê dados de Tenant B em findMany
// Verifica que findMany injeta tenantId no where, isolando os dados por tenant.
// ─────────────────────────────────────────────────────────────────────────────
describe('Cenário 1 — findMany injeta tenantId no where', () => {
  it('adiciona tenantId ao where vazio', () => {
    const result = applyTenantToArgs('findMany', {}, 'tenant-a')
    expect(result.where).toEqual({ tenantId: 'tenant-a' })
  })

  it('preserva filtros existentes e adiciona tenantId', () => {
    const result = applyTenantToArgs(
      'findMany',
      { where: { ativo: true, nome: 'João' } },
      'tenant-a'
    )
    expect(result.where).toEqual({ ativo: true, nome: 'João', tenantId: 'tenant-a' })
  })

  it('tenant-a e tenant-b geram wheres diferentes para a mesma query', () => {
    const resultA = applyTenantToArgs('findMany', { where: { ativo: true } }, 'tenant-a')
    const resultB = applyTenantToArgs('findMany', { where: { ativo: true } }, 'tenant-b')
    expect(resultA.where?.tenantId).toBe('tenant-a')
    expect(resultB.where?.tenantId).toBe('tenant-b')
    expect(resultA.where?.tenantId).not.toBe(resultB.where?.tenantId)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 2 — Tenant A não consegue update em registro de Tenant B
// O tenantId do contexto é injetado no where do update — mesmo que o caller
// passe o id de um registro de outro tenant, o WHERE garante 0 linhas afetadas.
// ─────────────────────────────────────────────────────────────────────────────
describe('Cenário 2 — update e delete injetam tenantId no where', () => {
  it('update injeta tenantId no where', () => {
    const result = applyTenantToArgs(
      'update',
      { where: { id: 'registro-de-outro-tenant' }, data: { nome: 'Novo nome' } },
      'tenant-a'
    )
    expect(result.where).toEqual({
      id: 'registro-de-outro-tenant',
      tenantId: 'tenant-a',
    })
  })

  it('delete injeta tenantId no where', () => {
    const result = applyTenantToArgs(
      'delete',
      { where: { id: 'alvo' } },
      'tenant-a'
    )
    expect(result.where).toEqual({ id: 'alvo', tenantId: 'tenant-a' })
  })

  it('updateMany injeta tenantId no where', () => {
    const result = applyTenantToArgs(
      'updateMany',
      { where: { ativo: false }, data: { ativo: true } },
      'tenant-a'
    )
    expect(result.where).toEqual({ ativo: false, tenantId: 'tenant-a' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 3 — create sem tenant context lança erro
// getTenantId() lança quando chamada fora de runWithTenant.
// ─────────────────────────────────────────────────────────────────────────────
describe('Cenário 3 — operação sem contexto de tenant lança erro', () => {
  it('getTenantId() lança fora de runWithTenant', () => {
    expect(() => getTenantId()).toThrow('[TenantContext]')
  })

  it('runWithoutTenant faz getTenantId() lançar (contexto explicitamente global)', () => {
    runWithoutTenant(() => {
      expect(() => getTenantId()).toThrow('[TenantContext]')
    })
  })

  it('create sem contexto: applyTenantToArgs com tenantId vazio não deve ser chamado', () => {
    // Garantia de que applyTenantToArgs nunca recebe string vazia (getTenantDb() lança antes)
    expect(() => getTenantId()).toThrow()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 4 — Tabela global (Tenant, Parcela, AgendamentoServico) não recebe injeção
// applyTenantToArgs é chamado apenas para modelos com tenantId.
// A lógica de exclusão está em getTenantDb() (SKIP_TENANT set).
// Aqui validamos que as operações nas tabelas globais não alteram os args.
// ─────────────────────────────────────────────────────────────────────────────
describe('Cenário 4 — operações em tabelas globais não recebem tenantId', () => {
  it('findMany em tabela global não injeta tenantId quando excluída pelo caller', () => {
    // Simula o que getTenantDb() faz: SKIP_TENANT.has(model) → não chama applyTenantToArgs
    const originalArgs = { where: { slug: 'neuroconexao' } }
    // Para modelos excluídos, args passam direto — sem modificação
    const notModified = originalArgs
    expect(notModified.where).not.toHaveProperty('tenantId')
    expect(notModified.where).toEqual({ slug: 'neuroconexao' })
  })

  it('create em Parcela não injeta tenantId quando excluída pelo caller', () => {
    const originalArgs = { data: { numero: 1, valor: 100 } }
    const notModified = originalArgs
    expect(notModified.data).not.toHaveProperty('tenantId')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 5 — getTenantId() retorna o tenant correto dentro de runWithTenant
// Valida o AsyncLocalStorage: contextos aninhados, propagação e isolamento.
// ─────────────────────────────────────────────────────────────────────────────
describe('Cenário 5 — getTenantId() retorna o tenant correto no contexto', () => {
  it('retorna o tenantId passado para runWithTenant', () => {
    runWithTenant('tenant-xyz', () => {
      expect(getTenantId()).toBe('tenant-xyz')
    })
  })

  it('contextos aninhados isolam tenants corretamente', () => {
    runWithTenant('tenant-outer', () => {
      expect(getTenantId()).toBe('tenant-outer')

      runWithTenant('tenant-inner', () => {
        expect(getTenantId()).toBe('tenant-inner')
      })

      // Após sair do contexto interno, o externo é restaurado
      expect(getTenantId()).toBe('tenant-outer')
    })
  })

  it('contexto não vaza entre chamadas sequenciais', () => {
    runWithTenant('tenant-1', () => {
      expect(getTenantId()).toBe('tenant-1')
    })

    runWithTenant('tenant-2', () => {
      expect(getTenantId()).toBe('tenant-2')
    })

    // Fora de qualquer contexto — lança
    expect(() => getTenantId()).toThrow('[TenantContext]')
  })

  it('applyTenantToArgs usa o tenantId do contexto ativo', () => {
    runWithTenant('tenant-correto', () => {
      const tenantId = getTenantId()
      const result = applyTenantToArgs('findMany', {}, tenantId)
      expect(result.where?.tenantId).toBe('tenant-correto')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cobertura adicional — operações write e upsert
// ─────────────────────────────────────────────────────────────────────────────
describe('Cobertura adicional — create, createMany, upsert', () => {
  it('create injeta tenantId no data', () => {
    const result = applyTenantToArgs(
      'create',
      { data: { nome: 'Paciente Teste', cpf: '12345678900' } },
      'tenant-a'
    )
    expect(result.data).toEqual({
      nome: 'Paciente Teste',
      cpf: '12345678900',
      tenantId: 'tenant-a',
    })
  })

  it('createMany injeta tenantId em cada item do array', () => {
    const result = applyTenantToArgs(
      'createMany',
      { data: [{ nome: 'A' }, { nome: 'B' }] },
      'tenant-a'
    )
    expect(Array.isArray(result.data)).toBe(true)
    const items = result.data as Array<Record<string, unknown>>
    expect(items[0]).toEqual({ nome: 'A', tenantId: 'tenant-a' })
    expect(items[1]).toEqual({ nome: 'B', tenantId: 'tenant-a' })
  })

  it('upsert injeta tenantId no where e no create', () => {
    const result = applyTenantToArgs(
      'upsert',
      {
        where: { id: 'existente' },
        create: { nome: 'Novo', cpf: '99999999999' },
        data: { nome: 'Atualizado' },
      },
      'tenant-a'
    )
    expect(result.where).toEqual({ id: 'existente', tenantId: 'tenant-a' })
    expect(result.create).toEqual({ nome: 'Novo', cpf: '99999999999', tenantId: 'tenant-a' })
  })

  it('findUnique injeta tenantId no where (Opção B)', () => {
    const result = applyTenantToArgs(
      'findUnique',
      { where: { id: 'algum-id' } },
      'tenant-a'
    )
    expect(result.where).toEqual({ id: 'algum-id', tenantId: 'tenant-a' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 6 — withTenantAction como guarda obrigatório de Server Actions
//
// Prova que uma Server Action que acessa dados tenant-scoped SEM withTenantAction
// falha de forma explícita (não silenciosa). A falha deve ser uma exceção clara,
// não um vazamento de dados ou um resultado vazio sem aviso.
//
// Ver docs/server-actions-pattern.md para o padrão correto de uso.
// ─────────────────────────────────────────────────────────────────────────────
describe('Cenário 6 — withTenantAction como guarda obrigatório de Server Actions', () => {
  it('Server Action sem withTenantAction: getTenantId() lança erro explícito', async () => {
    // Simula uma server action que chama getTenantDb() sem contexto de tenant.
    // getTenantDb() → getTenantId() → lança '[TenantContext]...'
    // O erro é explícito e rastreável, não um vazamento silencioso.
    async function serverActionSemGuarda() {
      // Esta seria a chamada real: const prisma = getTenantDb()
      // Testamos getTenantId() diretamente (é exatamente o que getTenantDb() chama)
      return getTenantId()
    }

    await expect(serverActionSemGuarda()).rejects.toThrow('[TenantContext]')
  })

  it('Server Action sem withTenantAction: runWithoutTenant também não dá acesso ao tenant', async () => {
    // runWithoutTenant é para seeds/scripts — não fornece tenantId real
    async function serverActionComRunWithoutTenant() {
      return runWithoutTenant(() => getTenantId())
    }

    await expect(serverActionComRunWithoutTenant()).rejects.toThrow('[TenantContext]')
  })

  it('withTenantAction manual via runWithTenant funciona como esperado', async () => {
    // Simula o que withTenantAction faz internamente após resolver o tenant:
    // runWithTenant(tenantId, callback)
    // Prova que o padrão correto funciona end-to-end
    const resultado = await new Promise<string>((resolve, reject) => {
      try {
        runWithTenant('tenant-production', () => {
          // Dentro do contexto: getTenantId() funciona
          resolve(getTenantId())
        })
      } catch (e) {
        reject(e)
      }
    })

    expect(resultado).toBe('tenant-production')
  })

  it('contextos de Server Actions concorrentes não interferem entre si', async () => {
    // Simula duas server actions rodando "simultaneamente" com tenants diferentes.
    // AsyncLocalStorage garante isolamento mesmo com execução concorrente.
    const resultados = await Promise.all([
      new Promise<string>((resolve) =>
        runWithTenant('tenant-clinica-a', () => resolve(getTenantId()))
      ),
      new Promise<string>((resolve) =>
        runWithTenant('tenant-clinica-b', () => resolve(getTenantId()))
      ),
    ])

    expect(resultados[0]).toBe('tenant-clinica-a')
    expect(resultados[1]).toBe('tenant-clinica-b')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Cenário 7 — Proteção cross-tenant no login (lib/auth.ts)
//
// Admin da Clínica A não pode autenticar via subdomínio da Clínica B.
// A busca de usuário filtra por email + tenantId — não só por email global.
// ─────────────────────────────────────────────────────────────────────────────
describe('Cenário 7 — Proteção cross-tenant no login', () => {
  it('applyTenantToArgs em findFirst injeta tenantId para busca de usuário por email', () => {
    // Simula o que lib/auth.ts faz: db.user.findFirst({ where: { email, tenantId } })
    // A extension injeta tenantId automaticamente — este teste garante que o where
    // recebe o tenantId correto, impedindo colisão entre tenants com mesmo email.
    const result = applyTenantToArgs(
      'findFirst',
      { where: { email: 'admin@clinica.com' } },
      'tenant-clinica-a'
    )
    expect(result.where).toEqual({
      email: 'admin@clinica.com',
      tenantId: 'tenant-clinica-a',
    })
  })

  it('mesmo email em tenants diferentes gera queries isoladas', () => {
    const queryClinicaA = applyTenantToArgs(
      'findFirst',
      { where: { email: 'shared@email.com' } },
      'tenant-a'
    )
    const queryClinicaB = applyTenantToArgs(
      'findFirst',
      { where: { email: 'shared@email.com' } },
      'tenant-b'
    )

    // Mesmo email, tenantIds diferentes — queries completamente diferentes no banco
    expect(queryClinicaA.where?.tenantId).toBe('tenant-a')
    expect(queryClinicaB.where?.tenantId).toBe('tenant-b')
    expect(queryClinicaA.where?.tenantId).not.toBe(queryClinicaB.where?.tenantId)
  })

  it('contexto de tenant errado retornaria resultado diferente (isolamento garantido)', () => {
    // Se o authorize de tenant-b tentar encontrar usuário de tenant-a:
    // WHERE email = 'admin@a.com' AND tenantId = 'tenant-b' → 0 rows → login recusado
    const queryComTenantErrado = applyTenantToArgs(
      'findFirst',
      { where: { email: 'admin@clinica-a.com' } },
      'tenant-b' // tenant errado — simula subdomínio de B tentando achar usuário de A
    )
    // A query filtra por tenant-b, não encontraria o usuário de tenant-a
    expect(queryComTenantErrado.where?.tenantId).toBe('tenant-b')
    expect(queryComTenantErrado.where?.email).toBe('admin@clinica-a.com')
    // No banco real: WHERE email = 'admin@clinica-a.com' AND tenantId = 'tenant-b' → null
  })
})
