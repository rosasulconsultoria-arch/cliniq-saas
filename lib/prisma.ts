/**
 * Prisma Client Extension — Isolamento Multi-tenant
 *
 * Esta extensão injeta `tenantId` automaticamente em todas as queries via
 * AsyncLocalStorage, sem necessidade de passar o campo manualmente por cada
 * server action ou função de biblioteca.
 *
 * Decisão findUnique → findFirst (Opção B — ver ARCHITECTURE.md § Trade-offs):
 * `findUnique` e `findUniqueOrThrow` recebem o `tenantId` injetado no `where`.
 * Em nível SQL, o resultado é idêntico a um `findFirst` com filtro adicional.
 * A unicidade do campo original (UUID/cuid) garante ≤ 1 resultado por tenant.
 * Isso preserva a semântica correta sem type assertions no código de aplicação.
 *
 * Modelos excluídos da injeção: Tenant, Parcela, AgendamentoServico.
 */

import { db } from './db'
import { getTenantId } from './tenant-context'

// Modelos que não possuem tenantId no schema — ignorados pela extensão
const SKIP_TENANT = new Set(['Tenant', 'Parcela', 'AgendamentoServico'])

// Tipo interno mínimo para manipulação genérica de args dentro da extensão.
// Confinado a este arquivo — código de aplicação usa os tipos Prisma normais.
type GenericArgs = {
  where?: Record<string, unknown>
  data?: Record<string, unknown> | Array<Record<string, unknown>>
  create?: Record<string, unknown>
}

/**
 * Aplica injeção de tenantId nos args de acordo com a operação.
 * Função pura exportada para facilitar testes unitários.
 */
export function applyTenantToArgs(
  operation: string,
  args: GenericArgs,
  tenantId: string
): GenericArgs {
  const a = { ...args }

  if (
    operation === 'findMany' ||
    operation === 'findFirst' ||
    operation === 'findFirstOrThrow' ||
    operation === 'count' ||
    operation === 'aggregate' ||
    operation === 'groupBy' ||
    // Opção B: tenantId injetado no where; unicidade do campo original garante ≤1 linha
    operation === 'findUnique' ||
    operation === 'findUniqueOrThrow' ||
    // Proteção contra writes cross-tenant
    operation === 'update' ||
    operation === 'updateMany' ||
    operation === 'delete' ||
    operation === 'deleteMany'
  ) {
    a.where = { ...a.where, tenantId }
  } else if (operation === 'create') {
    a.data = { ...(a.data as Record<string, unknown>), tenantId }
  } else if (operation === 'createMany') {
    a.data = Array.isArray(a.data)
      ? a.data.map(item => ({ ...item, tenantId }))
      : { ...(a.data as Record<string, unknown>), tenantId }
  } else if (operation === 'upsert') {
    a.where = { ...a.where, tenantId }
    a.create = { ...a.create, tenantId }
  }

  return a
}

/**
 * Retorna um cliente Prisma com isolamento de tenant aplicado.
 * Deve ser usado no lugar de `db` em todas as server actions e rotas autenticadas.
 *
 * @throws {Error} Se chamado fora de um contexto de tenant (sem runWithTenant ativo)
 *
 * @example
 * // Em uma server action:
 * const prisma = getTenantDb()
 * const pacientes = await prisma.paciente.findMany()
 * // WHERE tenantId = '<tenant atual>' injetado automaticamente
 */
export function getTenantDb() {
  const tenantId = getTenantId()

  return db.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (SKIP_TENANT.has(model)) return query(args)

          const modified = applyTenantToArgs(
            operation,
            args as GenericArgs,
            tenantId
          )

          return query(modified as typeof args)
        },
      },
    },
  })
}
