# Roteamento por Tenant — Fluxo Completo

## Visão geral

Cada clínica (tenant) acessa o sistema pelo seu próprio subdomínio:

```
neuroconexao.cliniq.com.br  →  tenant: Neuroconexão
outraClinica.cliniq.com.br  →  tenant: Outra Clínica
```

Em desenvolvimento local, o tenant é fixo via variável de ambiente:

```
localhost:3000  →  tenant definido por DEV_TENANT_SLUG=neuroconexao
```

---

## Fluxo por request (GET — renderização de página)

```
1. Browser: GET neuroconexao.cliniq.com.br/dashboard
      ↓
2. middleware.ts (Edge Runtime)
   - Extrai slug do host: 'neuroconexao'
   - Verifica autenticação (NextAuth)
   - Injeta header: x-tenant-slug = 'neuroconexao'
   - NextResponse.next({ request: { headers } })
      ↓
3. app/layout.tsx (Node.js — Server Component)
   - Lê headers().get('x-tenant-slug') → 'neuroconexao'
   - getTenantBySlug('neuroconexao') → { id: 'tenant_xyz', ... }  [cache 5min]
   - Se não encontrado: notFound() → 404
   - runWithTenant('tenant_xyz', () => <html>...</html>)
      ↓
4. Server Components filhos
   - AsyncLocalStorage propaga tenantId pelo async context do Node.js
   - getTenantId() → 'tenant_xyz'  [disponível em toda a árvore RSC desta request]
   - getTenantDb() → cliente Prisma com tenantId injetado automaticamente
```

---

## Fluxo por request (POST — Server Action)

Server Actions são requisições POST independentes. O AsyncLocalStorage do layout
**não se propaga** para elas — cada Server Action precisa estabelecer seu próprio contexto.

```
1. Browser: POST /dashboard/pacientes (Server Action 'criarPaciente')
      ↓
2. middleware.ts (Edge Runtime)
   - Mesma lógica de slug e auth
   - Injeta x-tenant-slug = 'neuroconexao' na request
      ↓
3. Server Action (Node.js)
   - withTenantAction(async () => { ... })
     - headers().get('x-tenant-slug') → 'neuroconexao'
     - getTenantBySlug('neuroconexao') → { id: 'tenant_xyz' }  [cache]
     - runWithTenant('tenant_xyz', fn)
       - getTenantDb() → cliente Prisma com tenantId injetado
```

Ver `docs/server-actions-pattern.md` para o padrão obrigatório de uso em Server Actions.

---

## Arquivos envolvidos

| Arquivo | Responsabilidade |
|---|---|
| `middleware.ts` | Extrair slug, injetar `x-tenant-slug` na request |
| `app/layout.tsx` | Validar tenant no banco, chamar `runWithTenant()` |
| `lib/tenant-lookup.ts` | Busca de tenant por slug com `unstable_cache` |
| `lib/tenant-context.ts` | `AsyncLocalStorage`: `getTenantId()`, `runWithTenant()` |
| `lib/with-tenant-action.ts` | `withTenantAction()` para Server Actions |
| `lib/prisma.ts` | `getTenantDb()`: cliente Prisma com injeção automática |

---

## Desenvolvimento local

1. Adicione ao `.env.local`:
   ```
   DEV_TENANT_SLUG=neuroconexao
   ```

2. O middleware detecta `localhost` e usa `DEV_TENANT_SLUG` como slug.

3. O tenant `neuroconexao` deve existir no banco local
   (criado pela migration `001_create_neuroconexao_tenant.sql`).

---

## Casos especiais

**Root domain (`cliniq.com.br`):** o middleware redireciona para `/login`
(TODO: alterar para landing page de marketing quando disponível).

**Tenant inativo (`status = BLOQUEADO`):** o middleware deixa passar (não verifica status).
O bloqueio por inadimplência deve ser implementado em `app/layout.tsx` com verificação
de `tenant.status`. Adicionado como TODO no Prompt 1.6.

**Slugs inválidos (`xxxxx.cliniq.com.br`):** o layout retorna `notFound()` após a busca
no banco não retornar resultado.

---

## Cache de tenant

A busca por slug usa `unstable_cache` com TTL de 5 minutos e tag `'tenants'`.

Para invalidar o cache após uma atualização de tenant:
```typescript
import { revalidateTag } from 'next/cache'

// Na server action que atualiza o Tenant:
revalidateTag('tenants')
```

Isso será implementado no Prompt 1.6 junto com a refatoração das server actions.
