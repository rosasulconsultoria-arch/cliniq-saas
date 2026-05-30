# Dívida Técnica

## BUGS DESCOBERTOS NO SMOKE TEST 2026-05-27 — PRIORIZADOS

### PRIORIDADE 1 — BLOQUEADORES (impedem uso real)

**[P1.1]** DashboardLayout e todas as ~47 pages/layouts pós-auth em `app/(dashboard)/**` quebram com erro "Operação executada fora de contexto de tenant" ao acessar via browser.
- **Causa:** `runWithTenant` em `app/layout.tsx` envolve callback síncrono; React 19 RSC pipeline executa children depois, fora do ALS context
- **Estratégia decidida:** estender padrão do commit 8232f96 (header explícito + `getTenantBySlug` + `tenantId` em queries) para todas as pages/layouts do dashboard
- **Esforço estimado:** 3-4 horas, ~47 arquivos
- **NÃO codar sem autorização explícita do dono em sessão fresca**

---

### PRIORIDADE 2 — BUGS FUNCIONAIS/VISUAIS

### PRIORIDADE 2 — BUGS VISUAIS DE CONVERSÃO em /signup/plano

**[P2.1]** Botão "Começar trial gratuito de 14 dias" vazando dos cards (texto extrapola largura).

**[P2.2]** Toggle Mensal/Anual com MENSAL default. Decisão de produto: deveria ser ANUAL.

**[P2.3]** "1 profissional(is)", "10 local(is)" — flexão gramatical preguiçosa. Implementar pluralização correta.

**[P2.4]** Cards com larguras/alturas inconsistentes (Básico mais estreito que os outros).

---

### PRIORIDADE 3 — BUGS DE INFRAESTRUTURA

**[P3.1]** Link do email de verificação aponta hardcoded para `localhost:3000`. Quando dev rodando em outra porta (ex: 3002 quando 3000 ocupada), link quebra.
- Solução: usar variável env `BASE_URL` ou detectar porta do request

**[P3.2]** Resend free tier mudou política — `onboarding@resend.dev` só envia para email do dono da conta. Antes de produção, configurar domínio próprio no Resend.

**[P3.3]** Tenants de teste E2E ("Clínica A", "Clínica B") vazaram para o schema "public" em vez de ficarem isolados em "test_schema". Investigar:
- Em qual cenário `__tests__/e2e/setup.ts` grava no schema errado
- Provavelmente race condition ou env var `DATABASE_URL` apontando para errado em algum fluxo
- Não é catastrófico (banco de dev), mas é sintoma de bug de isolamento que pode ser pior em produção

---

### PRIORIDADE 4 — PENDÊNCIAS DE PRODUTO

**[P4.1]** "[NOME_DO_PRODUTO]" aparece como literal no cabeçalho — definir nome do produto antes de lançamento.

**[P4.2]** Transição `/signup/verificar` → `/signup/cartao` não está ligada — usuário vai para `/signup/sucesso-temporario` (placeholder). Conectar fluxo do E3 oficialmente.

---

### PRIORIDADE 5 — GAP DE COBERTURA DE TESTES (TODO crítico já registrado)

**[P5.1]** Suíte E2E atual (231 testes) não exercita o render pipeline real do Next.js. Bugs de ALS context, RSC rendering, e ciclo HTTP completo (login, signup) passam despercebidos.
- Mitigação atual: smoke test manual
- Solução longo prazo: adicionar Playwright ou Next.js test mode para testes HTTP reais que renderizem pages

---

### CONTEXTO DA SESSÃO 2026-05-30 (Bug 10 + Bug 11)

Bug 10 (ALS context em RSC pipeline) — corrigido em 8 sub-lotes, 44 arquivos, commits 84f5b32..e4f8107.
Bug 11 (refatoração Sala→Local incompleta) — descoberto no smoke test manual pós-Bug 10. Corrigido. 3 arquivos, 5 linhas. Commit imediatamente após Sub-lote 8.

---

### CONTEXTO DA SESSÃO 2026-05-27

- Fase 2 entregue: onboarding self-service, integração Asaas B2B, trial enforcement, billing UI, tour guiado
- Upgrade Next.js 14.2.35 → 15.5.18 + node middleware (4 etapas, branch isolada, merge limpo)
- 9 bugs latentes corrigidos durante a sessão (ver git log)
- 138 unit + 231 E2E = 369 testes passando
- Smoke test parado por opção (sessão longa, fadiga cognitiva acumulada — decisão correta)

---

## [CRÍTICO] Testes HTTP reais — cobertura faltando (descoberto 2026-05-27)

- **[CRÍTICO] Adicionar testes HTTP reais (Playwright ou Next.js test mode) que renderizam Server Components de verdade.**
  Cobertura faltando descoberta no smoke test 2026-05-27 — bug ALS context em `/login` passou despercebido pelos 359 testes existentes porque nenhum teste exercita o rendering pipeline real do Next.js.
  Os testes mockados em `__tests__/e2e/pre-auth-pages.test.ts` verificam a lógica de resolução de tenant, mas não detectariam uma regressão onde `runWithTenant()` no root layout parasse de propagar para Server Components filhos.
  Solução recomendada: Playwright com `next dev` ou `next start`, testando `/login`, `/agendar/[slug]`, `/cancelar/[token]` com subdomínio mockado via header `x-tenant-slug`.

---

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

- ~~**[ALTO] next-auth travado em beta.31 — travar versão no package.json**~~
  ✅ **CONCLUÍDO** (Lote E3, 2026-05-26) — `^` removido; `package.json` contém `"next-auth": "5.0.0-beta.31"`.
  Ver `ARCHITECTURE.md` § E3.2.

---

## [CONCLUÍDO] Upgrade Next.js 14.2.35 → 15.5.18

- ✅ React 18 → 19, react-dom 18 → 19, @types/react 18 → 19
- ✅ Codemod `next-async-request-api` aplicado em 34 arquivos (params/searchParams/headers() async)
- ✅ `serverExternalPackages` expandido para incluir Prisma + pg stack
- ✅ `dynamic+ssr:false` movido para Client Component wrappers (crm/mapa, dashboard)
- ✅ `lib/plans.ts` refatorado — Prisma removido do bundle client; `lib/server/plans-server.ts` criado
- ✅ `shadcn alert` instalado (era importado sem existir — bug latente)
- ✅ `middleware.ts` migrado para `config.runtime: 'nodejs'` (Next.js 15.5 sintaxe estável)
- ✅ Todos os gates: build OK, 138/138 unit, 198/198 e2e (incluindo Asaas)
- Branch: `chore/nextjs-15-upgrade`

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
