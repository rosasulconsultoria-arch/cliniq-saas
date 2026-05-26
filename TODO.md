# Dívida Técnica

## [CRÍTICO] Lote E3 — Bloqueadores de produção

- **[CRÍTICO] PCI DSS — tokenização de cartão obrigatória antes de produção real**
  Implementação atual: dados do cartão passam pelo servidor Next.js (PCI DSS SAQ D).
  Solução: tokenização frontend via Asaas.js (verificar disponibilidade Production) ou equivalente.
  Bloqueador absoluto antes do primeiro pagamento real de cliente.
  Ver `ARCHITECTURE.md` § E3.1.

- **[CRÍTICO] Webhook secret Asaas — configurar após primeiro deploy**
  `ASAAS_WEBHOOK_SECRET` está vazio — webhook aceita requests sem validação.
  Ação: gerar secret no painel Asaas → Configurações → Notificações → Webhooks,
  depois adicionar como variável de ambiente no Vercel.
  Ver `ARCHITECTURE.md` § E3.3.

- **[ALTO] next-auth travado em beta.31 — travar versão no package.json**
  Remover `^` de `"next-auth": "^5.0.0-beta.31"` para evitar upgrade automático.
  O JWT encode manual em `finalizarSignup` depende do formato desta versão.
  Ver `ARCHITECTURE.md` § E3.2.

---

## Fase 2

- **Atualizar `getLocalDisponivel` para considerar `ReservaLocal`** — atualmente pode sugerir local com reserva ativa de outro profissional. O agendamento será bloqueado na validação, mas a UX fica ruim (local sugerido e depois recusado). Ver `lib/agendamento.ts`.

---

# Testes de Isolamento Multi-tenant

## Estado atual dos testes (pós-Lote 3)

Os 26 testes em `__tests__/tenant-isolation.test.ts` cobrem:
- ✅ Prisma Client Extension: injeção de `tenantId` em `findMany`, `findFirst`, `create`, `createMany`, `update`, `delete`, `upsert`, `findUnique` (Opção B)
- ✅ AsyncLocalStorage: isolamento de contextos, contextos aninhados, não-vazamento entre requests
- ✅ `withTenantAction`: guarda obrigatório, falha explícita sem contexto, concorrência
- ✅ Login cross-tenant: email+tenantId, queries isoladas por tenant

## O que NÃO está coberto — CRÍTICO para o Prompt 1.7

### 🔴 Alta prioridade — risco de vazamento de dados

**1. Validações de unicidade ajustadas (`@@unique([campo, tenantId])`)**
- `email` de `User` único por tenant: testar que dois usuários com mesmo email em tenants diferentes não conflitam
- `cpf` de `Paciente` único por tenant: mesmo princípio
- `slugAgendamento` de `Profissional` único por tenant
- `nome` de `Sala` e `Servico` únicos por tenant

**2. `$queryRaw` com filtro explícito de `tenantId`**
- Confirmar que `getCrmStats()` retorna apenas dados do tenant ativo
- Confirmar que raw queries com `tenantId` na query string realmente filtram corretamente
- Testar com dois tenants ativos e dados distintos

**3. `Parcela` e `AgendamentoServico` (SKIP_TENANT)**
- Confirmar que `getContasAReceber()` não retorna parcelas de outros tenants
- Confirmar que `getFluxoCaixa()` não retorna parcelas de outros tenants
- Confirmar que `getCrmStats()` não conta serviços de outros tenants

### 🟡 Média prioridade — riscos operacionais

**4. Webhooks Asaas (`app/api/asaas/`)**
- Testar que o contexto de tenant é corretamente estabelecido a partir da sessão
- Testar que um agendamento de Tenant A não pode ser modificado via request autenticada de Tenant B

**5. Cron com isolamento por tenant (`app/api/cron/lembrete-24h/`)**
- Testar que lembretes de Tenant A não são enviados para pacientes de Tenant B
- Testar que falha em um tenant não interrompe processamento dos outros
- Verificar o log estruturado por tenantId em caso de erro

**6. Server Actions de autenticação fora do fluxo padrão**
- `esqueci-senha/actions.ts`: confirmar que email encontrado apenas no tenant do subdomínio
- `redefinir-senha/actions.ts`: confirmar que token de reset só funciona no tenant correto
- `trocar-senha/actions.ts`: confirmar isolamento via sessão+tenant

### 🟢 Baixa prioridade — cobertura complementar

**7. `getConfigClinica()` e `salvarConfigClinica()`**
- Confirmar que retornam/salvam apenas a ConfigClinica do tenant ativo
- Testar criação de ConfigClinica para tenant novo (sem registro existente)

**8. `seedServicosSeNecessario()`**
- Confirmar que conta apenas serviços do tenant ativo
- Confirmar que cria serviços apenas para o tenant ativo

---

## Prompt 1.7 — Testes E2E de Isolamento (CRÍTICO — não pode ser pulado)

**Status:** pendente  
**Prioridade:** CRÍTICO  
**Contexto:** sem esses testes, a correção do isolamento multi-tenant não pode ser considerada validada. Os testes unitários atuais testam a Extension em isolamento, mas não testam o fluxo completo com banco real.

**Objetivo do Prompt 1.7:**
1. Criar um banco de teste com dois tenants (Tenant A e Tenant B)
2. Inserir dados distintos para cada tenant
3. Executar queries nas funções de negócio e confirmar que cada tenant só vê seus dados
4. Cobrir todos os 8 pontos acima
5. Adicionar ao pipeline de CI se existir

**Referências:**
- `ARCHITECTURE.md` § "Padrões obrigatórios para queries multi-tenant"
- `docs/server-actions-pattern.md`
- `docs/tenant-routing.md`
- `prisma/manual/001a_seed_dev_tenant.sql` (para criar tenants de teste)
