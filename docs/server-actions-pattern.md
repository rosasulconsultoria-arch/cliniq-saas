# Padrão Obrigatório: withTenantAction em Server Actions

## Por que isso é necessário

Server Actions no Next.js são requisições POST independentes. O contexto
`AsyncLocalStorage` estabelecido no `app/layout.tsx` via `runWithTenant()` **não
se propaga** para Server Actions — cada uma tem seu próprio contexto de execução.

**Sem `withTenantAction`, o isolamento multi-tenant falha silenciosamente** em mutações:
- `getTenantId()` lança um erro explícito (não retorna undefined)
- `getTenantDb()` falha na chamada a `getTenantId()`
- O erro de runtime é visível — mas o ponto de falha é a ausência do guard

---

## Regra

> **Toda Server Action que lê ou escreve dados tenant-scoped DEVE ser envolvida
> por `withTenantAction`.**

---

## ✅ Padrão correto

```typescript
'use server'

import { withTenantAction } from '@/lib/with-tenant-action'
import { getTenantDb } from '@/lib/prisma'

export async function criarPaciente(data: PacienteInput) {
  return withTenantAction(async () => {
    const prisma = getTenantDb()
    return prisma.paciente.create({
      data: {
        nome: data.nome,
        cpf: data.cpf,
        // tenantId injetado automaticamente pela extensão Prisma
      },
    })
  })
}

export async function listarPacientes() {
  return withTenantAction(async () => {
    const prisma = getTenantDb()
    return prisma.paciente.findMany()
    // WHERE tenantId = '<tenant atual>' injetado automaticamente
  })
}
```

---

## ❌ Padrão incorreto — não use

```typescript
'use server'

import { db } from '@/lib/db'  // ❌ cliente sem isolamento de tenant

export async function criarPacienteInseguro(data: PacienteInput) {
  // ❌ SEM withTenantAction — getTenantId() vai lançar um erro
  // (ou, se o db fosse usado diretamente, escreveria sem tenantId)
  return db.paciente.create({ data: { nome: data.nome } })
}
```

```typescript
'use server'

import { getTenantDb } from '@/lib/prisma'

export async function criarPacienteInseguro2(data: PacienteInput) {
  // ❌ getTenantDb() chama getTenantId() que lança fora de contexto de tenant
  const prisma = getTenantDb()
  return prisma.paciente.create({ data: { nome: data.nome } })
}
```

---

## Exceções legítimas

Algumas operações são genuinamente globais e não precisam de `withTenantAction`:

| Operação | Motivo |
|---|---|
| Criar novo Tenant (onboarding) | Opera no modelo `Tenant` que não tem tenantId |
| Webhook de pagamento (Asaas SaaS) | Request externa autenticada por assinatura, não por sessão |
| Scripts de seed/migration | Usam `runWithoutTenant()` explicitamente |

Mesmo nesses casos, **nunca use `db` diretamente para dados tenant-scoped**.

---

## Operações de leitura em Server Components

Server Components (não Server Actions) podem usar `getTenantDb()` diretamente
se o componente renderizar dentro do contexto estabelecido pelo `app/layout.tsx`:

```typescript
// Em um Server Component (não uma Server Action):
import { getTenantDb } from '@/lib/prisma'

export default async function PacientesPage() {
  const prisma = getTenantDb()  // OK — contexto propagado pelo layout
  const pacientes = await prisma.paciente.findMany()
  return <PacientesList pacientes={pacientes} />
}
```

> **Nota:** A propagação do AsyncLocalStorage pelo layout para Server Components
> filhos funciona via Node.js async context. Se um componente específico falhar
> com "fora de contexto de tenant", envolver a leitura em `withTenantAction` é
> a solução segura.

---

## Roadmap de migração (Prompt 1.6)

As server actions existentes ainda usam `db` diretamente. Estão marcadas com:
```typescript
// TODO: aplicar withTenantAction + getTenantDb() — refatoração no Prompt 1.6
```

A migração será feita de forma sistemática no Prompt 1.6 — uma action por vez,
com testes de regressão após cada alteração.
