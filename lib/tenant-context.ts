import { AsyncLocalStorage } from 'async_hooks'

const storage = new AsyncLocalStorage<string>()

// Sentinel usado por runWithoutTenant — distingue "sem contexto" de "contexto global"
const NO_TENANT = '__no_tenant__'

/**
 * Retorna o tenantId da request atual.
 * Lança se chamada fora de um contexto de tenant (ex: fora de runWithTenant).
 */
export function getTenantId(): string {
  const id = storage.getStore()
  if (!id || id === NO_TENANT) {
    throw new Error(
      '[TenantContext] Operação executada fora de contexto de tenant. ' +
        'Use runWithTenant() em server actions e rotas, ' +
        'ou runWithoutTenant() em seeds e scripts de manutenção.'
    )
  }
  return id
}

/**
 * Executa fn dentro do contexto do tenant informado.
 * Usado pelo middleware do Next.js para propagar o tenant pela request.
 */
export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return storage.run(tenantId, fn)
}

/**
 * Executa fn sem contexto de tenant.
 * Para uso exclusivo em seeds, migrations e scripts de manutenção.
 * Operações dentro deste contexto NÃO têm tenantId injetado automaticamente —
 * o caller é responsável por filtrar dados manualmente.
 */
export function runWithoutTenant<T>(fn: () => T): T {
  return storage.run(NO_TENANT, fn)
}
