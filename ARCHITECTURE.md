# ARCHITECTURE.md — Decisões Arquiteturais para o SaaS Multi-tenant

> Documento de decisão técnica. Cada seção define um problema, apresenta opções com prós/contras objetivos e recomenda uma decisão. O campo `[DECIDIDO POR:]` e `[DATA:]` deve ser preenchido pelo responsável técnico ao confirmar cada decisão.

---

## Análise do Schema Atual

O schema Prisma atual possui **20 models** e **6 enums**.

### Models existentes

| # | Model | Precisa de `tenantId`? | Motivo |
|---|---|---|---|
| 1 | `User` | **Sim** | Usuários pertencem a uma clínica |
| 2 | `Profissional` | **Sim** | Profissionais pertencem a uma clínica |
| 3 | `Paciente` | **Sim** | Pacientes pertencem a uma clínica |
| 4 | `Sala` | **Sim** | Salas pertencem a uma clínica |
| 5 | `Disponibilidade` | **Sim** | Consultada diretamente para montar agenda |
| 6 | `Bloqueio` | **Sim** | Consultado diretamente para montar agenda |
| 7 | `Agendamento` | **Sim** | Core do sistema |
| 8 | `CategoriaFinanceira` | **Sim** | Cada clínica tem suas categorias |
| 9 | `TransacaoFinanceira` | **Sim** | Dados financeiros por clínica |
| 10 | `Comissao` | **Sim** | Dados financeiros por clínica |
| 11 | `Parcelamento` | **Sim** | Dados financeiros por clínica |
| 12 | `Parcela` | Não* | Sempre acessada via `Parcelamento.id` |
| 13 | `ConfigClinica` | **Sim** | Torna-se o próprio model `Tenant` |
| 14 | `Servico` | **Sim** | Cada clínica define seus serviços |
| 15 | `AgendamentoServico` | Não* | Join table, acessada via `Agendamento.id` |
| 16 | `CrmTemplate` | **Sim** | Templates pertencem a uma clínica |
| 17 | `CrmCampanha` | **Sim** | Campanhas pertencem a uma clínica |
| 18 | `TaxaImposto` | **Sim** | Configuração fiscal por clínica |
| 19 | `DespesaProfissional` | **Sim** | Dados financeiros por clínica |
| 20 | `Aluguel` | **Sim** | Dados financeiros por clínica |

> *`Parcela` e `AgendamentoServico` não precisam de `tenantId` direto pois nunca são consultadas globalmente — sempre via foreign key de um parent que já tem tenant filtrado. Podem receber o campo como defesa em profundidade numa segunda fase.

**Resultado:** 18 de 20 models precisam de `tenantId`. Um novo model `Tenant` será criado (evolução de `ConfigClinica`).

**Problema imediato identificado:** `User.email` é `@unique` global. Em multi-tenant, o mesmo e-mail pode existir em duas clínicas diferentes. A constraint única deve ser `@@unique([email, tenantId])`.

---

## Decisão 1 — Estratégia de Multi-tenancy

### Problema

O sistema atual opera com uma única clínica hardcoded (`ConfigClinica` com `id = "default"`). Para o SaaS, múltiplas clínicas precisam coexistir no mesmo sistema com dados completamente isolados. Existem três arquiteturas fundamentais, cada uma com trade-offs de custo, complexidade e isolamento.

### Opções consideradas

**Opção A: Shared Database + Shared Schema + `tenantId`** (row-level isolation)

Todas as clínicas compartilham as mesmas tabelas. Cada linha tem uma coluna `tenantId` que identifica o dono. O isolamento é garantido em software (queries sempre filtram por `tenantId`).

| Prós | Contras |
|---|---|
| Menor custo de infraestrutura | Risco de vazamento se filtro for esquecido |
| Migrações simples — uma migration para todos | Queries sem índice em `tenantId` degradam performance |
| Prisma e Supabase funcionam sem alteração | Sem isolamento de hardware entre tenants |
| Mais fácil de depurar e observar | Tenant grande afeta performance de todos |

**Opção B: Shared Database + Schema por tenant** (schema-level isolation)

Cada clínica tem seu próprio PostgreSQL schema (`neuroconexao.agendamentos`, `clinicaxyz.agendamentos`). Prisma apontaria para o schema correto por request.

| Prós | Contras |
|---|---|
| Isolamento melhor — dados fisicamente separados | Prisma não suporta schemas dinâmicos nativamente |
| Backup e restore por tenant mais simples | Migrações precisam rodar em N schemas — operacionalmente complexo |
| SQL injection em um tenant não afeta outro | Custo de conexões cresce com número de tenants |

**Opção C: Database por tenant**

Cada clínica tem sua própria instância ou banco de dados PostgreSQL.

| Prós | Contras |
|---|---|
| Máximo isolamento possível | Custo proibitivo para early-stage |
| Compliance/LGPD mais simples | Conexão pool multiplica por número de tenants |
| Tenant pode migrar para on-premise | Migrações são operações distribuídas complexas |

### Decisão recomendada

**Opção A — Shared Database + `tenantId`.**

É a arquitetura correta para um SaaS em estágio inicial no Brasil. O custo da Opção C é inviável; a Opção B exige trabalho manual não suportado pelo Prisma que compromete a velocidade de desenvolvimento. A Opção A escala bem até centenas de tenants sem custo adicional de infra e permite lançar o produto mais rápido.

Os riscos da Opção A são mitigados pela Decisão 2 (isolamento automático via extensão Prisma).

### Implicações práticas

- Criar model `Tenant` (evolução de `ConfigClinica`) com campos: `id`, `slug`, `nome`, `plano`, `status`, `trialExpiraEm`, `createdAt`
- Adicionar `tenantId String` + `@@index([tenantId])` em 18 models
- `User.email @unique` vira `@@unique([email, tenantId])`
- `Sala.nome @unique` vira `@@unique([nome, tenantId])`
- `Servico.nome @unique` vira `@@unique([nome, tenantId])`
- `Profissional.slugAgendamento @unique` vira `@@unique([slugAgendamento, tenantId])`
- Migration escrita manualmente (não gerada) para não quebrar dados existentes da Neuroconexão

---

**[DECIDIDO POR: ]**
**[DATA: ]**

---

## Decisão 2 — Estratégia de Isolamento de Dados

### Problema

Com `tenantId` em todas as tabelas, toda query Prisma precisa filtrar por esse campo. Esquecer um único `where: { tenantId }` numa server action vaza dados de outro tenant. O risco não é hipotético — é certo que acontecerá se a responsabilidade ficar com o desenvolvedor manualmente.

### Opções consideradas

**Opção A: Prisma Client Extension (`$extends` com query middleware)**

Um wrapper em torno do `db` que injeta `tenantId` automaticamente em todas as operações de leitura e escrita.

```typescript
// lib/tenant-db.ts
function createTenantDb(tenantId: string) {
  return db.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        // findFirst, findUnique, create, update, delete...
      }
    }
  })
}
```

| Prós | Contras |
|---|---|
| Zero risco de esquecer filtro em queries | `$extends` cria novo objeto por chamada (overhead mensurável) |
| Centralizado — mudança em um lugar | Operações `$queryRaw` não são interceptadas |
| API idêntica ao `db` atual — sem refactor | Precisa de AsyncLocalStorage ou passagem explícita do tenantId |

**Opção B: Passagem manual de `tenantId` em cada query**

Cada server action recebe `tenantId` da sessão e passa para o `where` da query.

| Prós | Contras |
|---|---|
| Zero magia — fácil de auditar | Um esquecimento = vazamento de dados |
| Sem overhead de runtime | Refactor massivo em 100+ queries existentes |
| Funciona com `$queryRaw` | Impossible de garantir via linting |

**Opção C: Row Level Security (RLS) no PostgreSQL**

Políticas RLS no banco garantem que uma query só retorna linhas do tenant correto, independente do código.

```sql
ALTER TABLE "Agendamento" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Agendamento"
  USING (tenant_id = current_setting('app.tenant_id')::text);
```

| Prós | Contras |
|---|---|
| Isolamento garantido no banco — à prova de bugs de código | Configuração complexa com Prisma + connection pool |
| Protege até contra `$queryRaw` | `SET app.tenant_id` precisa rodar em cada conexão (difícil com pool) |
| LGPD/compliance mais sólido | Difícil de debugar — erros silenciosos |

**Opção D: Prisma Extension (primária) + RLS (defesa em profundidade)**

Combina A e C: a extensão filtra no código; o RLS no banco é um segundo firewall.

| Prós | Contras |
|---|---|
| Máxima segurança | Maior complexidade de setup inicial |
| Extensão facilita dev; RLS protege o banco | Dois sistemas para manter e sincronizar |

### Decisão recomendada

**Opção A para MVP, com caminho para Opção D.**

A Prisma Client Extension é a solução mais pragmática: resolve o problema de forma centralizada, mantém a API familiar para o código já escrito, e permite lançar mais rápido. O overhead de performance da extensão é negível para o volume inicial.

A implementação usa `AsyncLocalStorage` do Node.js para propagar o `tenantId` sem passar explicitamente por todas as camadas:

```typescript
// lib/tenant-context.ts
import { AsyncLocalStorage } from 'async_hooks'
export const tenantContext = new AsyncLocalStorage<string>()
export function getTenantId() {
  const id = tenantContext.getStore()
  if (!id) throw new Error('Fora de contexto de tenant')
  return id
}
```

O middleware Next.js resolve o tenant pelo subdomínio e inicia o contexto. O RLS pode ser adicionado como hardening na fase de compliance (pós-lançamento).

### Implicações práticas

- `lib/tenant-context.ts` — `AsyncLocalStorage` com `getTenantId()`, `runWithTenant()`, `runWithoutTenant()`
- `lib/prisma.ts` — `getTenantDb()` que retorna `db.$extends(...)` com injeção automática de `tenantId`
- `lib/db.ts` — mantido com o cliente Prisma base (sem tenant); usado diretamente apenas por `lib/prisma.ts` e scripts
- Atualizar `middleware.ts` — resolver tenant pelo host, armazenar no contexto com `runWithTenant()`
- Atualizar todas as server actions para usar `getTenantDb()` no lugar de `db` diretamente
- Atualizar `lib/auth.ts` — busca de usuário no `authorize` precisa filtrar por tenant (lido do host da request)
- A sessão NextAuth precisa incluir `tenantId` no token JWT

### Trade-offs conhecidos

#### `findUnique` → injeção de `tenantId` no `where` (Opção B)

**Problema:** O tipo TypeScript de `findUnique.where` aceita apenas combinações de campos únicos definidos no schema. Injetar `tenantId` quebraria a verificação de tipos em código de aplicação (Opção A — descartada).

**Decisão adotada (Opção B):** A extensão Prisma intercepta `findUnique` e `findUniqueOrThrow` e injeta `tenantId` no `where`. Em nível SQL, o comportamento é idêntico a um `findFirst` com filtro adicional: `WHERE campo_unico = ? AND tenant_id = ?`. A unicidade dos campos originais (UUID/cuid gerados globalmente) garante que no máximo 1 linha satisfaça a condição por tenant.

**Por que funciona corretamente:** Um agendamento com `id = 'cld_xyz'` só existe em um tenant. Mesmo que o filtro adicional `AND tenant_id = 'tenant-a'` seja aplicado, o resultado é o mesmo — o único registro com aquele id pertencente ao tenant correto. Se o id pertencer a outro tenant, 0 linhas são retornadas, protegendo contra acesso cross-tenant.

**Único ponto de type escape no codebase:** `lib/prisma.ts`, na conversão de `args as GenericArgs`. Confinado à infraestrutura; código de aplicação (server actions, rotas) usa os tipos Prisma normais sem nenhuma asserção.

**Limitação conhecida:** `count`, `aggregate` e `groupBy` também recebem o filtro `where: { tenantId }`. Essas operações sempre operam sobre dados do tenant ativo — comportamento correto e intencional.

---

**[DECIDIDO POR: ]**
**[DATA: ]**

---

## Decisão 3 — Estratégia de Roteamento por Tenant

### Problema

O sistema precisa identificar qual clínica está acessando cada request para carregar o tenant correto, aplicar o tema visual (logo, cor primária) e filtrar os dados. Existem três estratégias de URL, cada uma com implicações em DNS, SEO, Vercel e experiência do usuário.

### Opções consideradas

**Opção A: Subdomínio por tenant**

`neuroconexao.cliniq.com.br`, `clinicaxyz.cliniq.com.br`

| Prós | Contras |
|---|---|
| Padrão de mercado SaaS (Notion, Linear, Vercel) | Requer wildcard DNS (`*.cliniq.com.br`) |
| Branding profissional para cada clínica | Vercel requer plano Pro para wildcard domains |
| Cookies de sessão isolados por subdomínio naturalmente | Certificado SSL wildcard necessário |
| Next.js middleware lê `request.headers.get('host')` — simples | Usuário precisa lembrar URL da sua clínica |

**Opção B: Path-based por tenant**

`cliniq.com.br/neuroconexao/dashboard`, `cliniq.com.br/clinicaxyz/dashboard`

| Prós | Contras |
|---|---|
| Zero configuração de DNS adicional | URL longa e menos profissional |
| Funciona em qualquer plano Vercel | Roteamento via middleware mais complexo (rewrite de paths) |
| Mais fácil para desenvolvimento local | Cookies compartilhados — risco de vazamento de sessão entre tenants |
| SEO compartilha domain authority | Conflito com rotas existentes (ex: `/dashboard` vira `/[slug]/dashboard`) — refactor massivo |

**Opção C: Subdomínio para dashboard + slug na URL pública de agendamento**

Dashboard: `neuroconexao.cliniq.com.br`
Agendamento público: `cliniq.com.br/agendar/joao-silva` (mantém rota atual)

| Prós | Contras |
|---|---|
| Dashboard profissional via subdomínio | Dois padrões de URL para manter |
| Agendamento público sem subdomínio — mais fácil de compartilhar no WhatsApp | Middleware precisa tratar dois cenários |
| Rota `/agendar/[slug]` já existe — zero refactor | Mais lógica condicional |

### Decisão recomendada

**Opção A — subdomínio puro.**

É o padrão correto para um produto SaaS B2B. O plano Pro do Vercel é custo justificável (wildcard domains são necessários de qualquer forma para certificados SSL). O Next.js middleware já tem o hook perfeito para resolver o tenant via `request.headers.get('host')`.

A rota pública `/agendar/[slug]` funciona naturalmente sob o subdomínio do próprio profissional: `neuroconexao.cliniq.com.br/agendar/joao-silva` — isso inclusive resolve o problema atual de ambiguidade de slug (dois profissionais em clínicas diferentes podem ter o mesmo slug).

Para desenvolvimento local, usar o arquivo `hosts` do sistema para simular subdomínios (`neuroconexao.localhost:3000`).

### Implicações práticas

- Criar/atualizar `middleware.ts` para extrair tenant do `host`:
  ```typescript
  const host = request.headers.get('host') // neuroconexao.cliniq.com.br
  const slug = host.split('.')[0] // neuroconexao
  // Buscar Tenant no banco por slug (com cache Redis ou in-memory)
  ```
- Configurar wildcard DNS no provedor: `*.cliniq.com.br → Vercel`
- Configurar wildcard domain no Vercel (requer Pro)
- Adicionar `Tenant.slug` como campo único — é a chave de resolução do middleware
- Criar tabela de cache de tenant (Redis ou `next/cache`) para evitar query no banco em todo request
- Rota de cancelamento `/cancelar/[token]` também funciona sob o subdomínio do tenant
- Landing page e onboarding ficam em `cliniq.com.br` (sem subdomínio) — middleware trata `host === 'cliniq.com.br'` como rota principal

---

**[DECIDIDO POR: ]**
**[DATA: ]**

---

## Decisão 4 — Gateway de Pagamento para Assinaturas SaaS

### Problema

O sistema precisa cobrar as clínicas (tenants) recorrentemente pelo uso da plataforma. Isso é diferente do Asaas já integrado — aquele é para cobrança de pacientes pelos profissionais. Esta decisão trata de **quem cobra a clínica pelo SaaS**. O gateway precisa suportar: planos com trial, recorrência mensal/anual, gestão de inadimplência, PIX e boleto (mercado brasileiro), e webhooks confiáveis.

### Opções consideradas

**Opção A: Stripe**

| Prós | Contras |
|---|---|
| Melhor API de assinaturas do mercado (trials, dunning, proration, metered billing) | Cobrança via PIX recém adicionada — UX ainda imatura no Brasil |
| Dashboard e relatórios excelentes | Payouts em BRL com conversão de taxa |
| SDK TypeScript de primeira qualidade | Boleto bancário com prazo curto (3 dias) |
| Suporte a webhook com retentativas e logs | Reconhecimento de marca menor entre PMEs brasileiras |

**Opção B: Pagar.me** (Stone)

| Prós | Contras |
|---|---|
| PIX, boleto e cartão nativos no Brasil | API menos madura que Stripe |
| Marca reconhecida no mercado brasileiro | Documentação e SDK menos polidos |
| Suporte a assinaturas recorrentes | Suporte técnico mais lento |
| Planos de assinatura com cobranças automáticas | Webhooks menos confiáveis historicamente |

**Opção C: Asaas (unificar tudo no mesmo gateway)**

| Prós | Contras |
|---|---|
| Já integrado no projeto — zero fricção | Projetado para B2C (clínica cobra paciente), não B2B SaaS |
| Uma API para tudo — menos sistemas para manter | Portal do assinante limitado |
| Suporte forte a PIX e boleto | Gerenciamento de planos menos sofisticado |
| Familiaridade da equipe com a API | Asaas cobra por cobrança emitida — modelo de custo diferente |

**Opção D: Iugu**

| Prós | Contras |
|---|---|
| Focado em SaaS e assinaturas recorrentes | Market share menor, menos documentação |
| Marketplace com split de pagamento | Suporte técnico limitado |
| API razoável para assinaturas | Menos utilizado — menos garantia de estabilidade |

### Decisão recomendada

**Opção C — Asaas para assinaturas SaaS + Asaas mantido para cobranças de pacientes.**

O mercado-alvo são clínicas de saúde brasileiras que pagam por PIX e boleto. O Asaas tem suporte nativo a esses métodos, a equipe já conhece a API, e uma única integração reduz superfície de manutenção. O ganho prático de features avançadas do Stripe (dunning configurável, portal self-service, proration automática) não justifica o custo de implementação para os primeiros tenants.

O trial e o controle de inadimplência são gerenciados em código:
- `trialExpiraEm` no model `Tenant` — middleware bloqueia se vencido
- Webhook `PAYMENT_OVERDUE` do Asaas altera `statusAssinatura` para `BLOQUEADO`
- MRR e churn calculados diretamente no banco

### Implicações práticas

- Adicionar ao model `Tenant`: `asaasCustomerId`, `asaasSubscriptionId`, `plano`, `statusAssinatura`, `trialExpiraEm`
- Criar `lib/asaas-saas.ts` — funções para criar cliente, criar assinatura e cancelar (separado do `lib/asaas.ts` existente que é B2C)
- Criar `app/api/asaas/saas-webhook/route.ts` para tratar `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`
- Criar fluxo de onboarding: cadastro → trial 14 dias (controlado por `trialExpiraEm`) → Asaas Checkout para ativar plano
- Middleware bloqueia acesso ao dashboard se `statusAssinatura === 'BLOQUEADO'` e redireciona para página de pagamento
- Criar página `app/(dashboard)/assinatura/page.tsx` com resumo da assinatura e link para segunda via de boleto/PIX via Asaas

---

**[DECIDIDO POR: ]**
**[DATA: ]**

---

## Decisão 5 — Storage de Assets por Tenant

### Problema

Cada clínica tem ativos visuais próprios: logo, potencialmente fotos de profissionais, PDFs gerados. No sistema atual, logo e fotos são salvas como `base64` direto no banco (`ConfigClinica.logoBase64`, `Profissional.fotoBase64`) — solução funcional para single-tenant mas que não escala para multi-tenant (banco cresce com blobs binários, queries ficam lentas, sem CDN). Precisamos de uma solução de object storage com isolamento por tenant.

### Opções consideradas

**Opção A: Supabase Storage**

| Prós | Contras |
|---|---|
| Já no stack — mesma conta, mesma dashboard | Free tier de 1GB pode ser insuficiente com muitos tenants |
| Políticas de acesso por bucket (RLS-like) | CDN menos performático que R2/S3 em algumas regiões |
| SDK JavaScript integrado | Vendor lock-in na Supabase |
| Buckets por tenant = isolamento natural | |

**Opção B: AWS S3**

| Prós | Contras |
|---|---|
| Padrão da indústria — ampla documentação | Configuração IAM complexa |
| Escala infinita | Custo de egress (saída de dados) |
| CloudFront para CDN | Nova conta e billing para gerenciar |

**Opção C: Cloudflare R2**

| Prós | Contras |
|---|---|
| S3-compatible API — SDK AWS funciona sem mudança | Mais um serviço para configurar |
| **Zero egress fees** — custo muito mais baixo | Menos maduro que S3 |
| CDN global do Cloudflare incluído | Suporte menor que AWS |
| Pricing previsível | |

### Decisão recomendada

**Opção A — Supabase Storage para MVP.**

Zero custo de setup, zero nova conta, zero nova infraestrutura. A estratégia de buckets por tenant (`logos/[tenantId]/logo.png`) resolve o isolamento. 1GB free tier equivale a ~10.000 logos em alta resolução — suficiente para centenas de tenants na fase inicial.

Se o produto crescer e o egress do Supabase Storage se tornar custo relevante, migrar para R2 é simples porque ambos têm API compatível com S3. O Cloudflare R2 é o destino natural de longo prazo (zero egress é diferencial real).

### Implicações práticas

- Remover `logoBase64` de `ConfigClinica`/`Tenant` e `fotoBase64` de `Profissional`
- Adicionar `logoUrl` e `fotoUrl` (strings de URL pública)
- Criar bucket `cliniq-assets` no Supabase Storage com política de leitura pública
- Criar `lib/storage.ts` — helper para upload/delete/getUrl com prefixo por tenant
- Criar API route `app/api/upload/route.ts` para receber arquivo do cliente e retornar URL (nunca expor chave Supabase no cliente)
- Estrutura de paths: `logos/{tenantId}/logo.{ext}`, `fotos/{tenantId}/{profissionalId}.{ext}`

---

**[DECIDIDO POR: ]**
**[DATA: ]**

---

## Decisão 6 — E-mail Transacional por Tenant

### Problema

O sistema já envia e-mails via Resend (confirmação de agendamento, lembrete 24h, recuperação de senha). Em multi-tenant, cada clínica precisa que os e-mails apareçam com **seu próprio nome** para os pacientes — não "Cliniq genérico". A questão é até que ponto personalizar o remetente e se cada clínica usa seu próprio domínio de e-mail.

### Opções consideradas

**Opção A: Conta Resend única, display name por tenant**

Todos os e-mails saem de `noreply@cliniq.com.br`, mas o `from` exibe o nome da clínica:
`"Clínica Neuroconexão <noreply@cliniq.com.br>"`

| Prós | Contras |
|---|---|
| Zero configuração por tenant | Paciente vê domínio `cliniq.com.br` — menos profissional |
| Um domínio verificado — alta reputação de entrega | Clinica não tem identidade própria nos e-mails |
| Custo fixo e previsível | Não diferencia o produto no mercado enterprise |

**Opção B: Subdomínio por tenant no Resend**

Cada tenant usa `noreply@neuroconexao.cliniq.com.br`. O Resend suporta múltiplos domínios verificados numa conta.

| Prós | Contras |
|---|---|
| Clínica tem identidade própria no e-mail | Setup de DNS por tenant (CNAME, DKIM) — pode ser automatizado via Resend API |
| Mais profissional — diferencial de produto | Custo cresce com número de tenants (Resend cobra por domínio no plano pro) |
| Reputação de entrega por domínio — isolamento real | Complexidade de automação |

**Opção C: Domínio próprio da clínica**

Cada clínica registra seu próprio domínio no Resend: `contato@neuroconexao.com.br`

| Prós | Contras |
|---|---|
| Máxima identidade de marca | Requer que a clínica tenha domínio e configure DNS — barreira alta |
| E-mails saem do domínio da própria clínica | Suporte técnico custoso para guiar configuração |
| | Risco de má reputação de domínio de um tenant afeta outros |

### Decisão recomendada

**Opção A no plano básico; Opção B como feature premium.**

Para lançamento, Opção A é suficiente e profissional o bastante. O display name `"Clínica ABC via Cliniq"` ou simplesmente `"Clínica ABC <noreply@cliniq.com.br>"` comunica a identidade da clínica. A grande maioria dos pacientes não lê o domínio do remetente.

Opção B é um diferencial claro para planos Enterprise/Profissional — "e-mail com o seu domínio" é argumento de vendas real. O Resend tem API para adicionar domínios programaticamente, então pode ser semi-automatizado: a clínica fornece o subdomínio, o sistema mostra os registros DNS a configurar, e após verificação o Resend passa a usar esse domínio.

Opção C não deve ser oferecida — a barreira de configuração DNS é muito alta para o perfil de clínicas de saúde (não são técnicas).

### Implicações práticas

**Fase 1 (MVP):**
- Manter Resend como está — apenas um domínio verificado
- Atualizar templates de e-mail para incluir `nomeTenant` no `from` name e no corpo
- Adicionar ao model `Tenant`: `emailContato` (usado como `reply-to`)
- Alterar `lib/email.ts`: receber `tenant` como parâmetro e construir `from: "${tenant.nome} <noreply@cliniq.com.br>"`

**Fase 2 (plano premium):**
- Adicionar `Tenant.resendDomainId` e `Tenant.emailRemetente`
- Criar fluxo de configuração em `configuracoes/email` com instruções DNS e botão "Verificar domínio"
- Chamar `resend.domains.create()` e `resend.domains.verify()` via Resend API
- `lib/email.ts` usa o domínio verificado do tenant se disponível, senão fallback para `cliniq.com.br`

---

**[DECIDIDO POR: ]**
**[DATA: ]**

---

## Decisões de Performance

### Cache de dashboard e relatórios — `unstable_cache` removido (2026-05-21)

**Contexto:** `lib/dashboard.ts` e `lib/relatorios.ts` usavam `unstable_cache` do Next.js para cachear resultados de queries pesadas. Durante a refatoração multi-tenant (Lote 2), identificou-se que a chave de cache não incluía `tenantId` — o que causaria vazamento de dados entre tenants em produção (Tenant A receberia dados cacheados do Tenant B com o mesmo período de datas).

**Decisão:** remover `unstable_cache` de todas as funções de dashboard e relatórios. As funções voltaram a ser `async` puras sem cache.

**Justificativa:**
- Isolamento de dados é não-negociável; performance é negociável
- Com 1-50 tenants e PostgreSQL com índice em `tenantId`, queries de dashboard ficam abaixo de 100ms
- O cache de 300s gerava problema de UX: usuário criava agendamento e o dashboard não atualizava por 5 minutos
- Menos código para manter e menos risco de regressão nos lotes seguintes

**Caminho futuro:** quando o tráfego justificar, reintroduzir cache com `tenantId` como parâmetro explícito (e portanto como parte da chave de cache). Marcado com `// TODO(performance)` em cada função afetada.

### Isolamento de `Parcela` via `parcelamento.tenantId` (2026-05-21)

**Contexto:** o modelo `Parcela` não tem `tenantId` direto (acessado sempre via `Parcelamento`). A Prisma Client Extension detecta `model = 'Parcela'` e pula a injeção automática de `tenantId`.

**Decisão:** queries em `Parcela` usam o cliente `db` puro + filtro explícito `where: { parcelamento: { tenantId } }`, obtendo `tenantId` via `getTenantId()`.

**Padrão obrigatório:**
```typescript
const tenantId = getTenantId()
await db.parcela.findMany({
  where: { ..., parcelamento: { status: 'ATIVO', tenantId } }
})
```

**Nota no schema:** comentário `NOTE` adicionado ao model `Parcela` em `schema.prisma` como lembrete para futuros desenvolvedores.

---

## Padrões obrigatórios para queries multi-tenant

Estes padrões foram identificados durante a refatoração multi-tenant (Lotes 1-3) e DEVEM ser seguidos em todo código novo que acessa o banco. Violações criam vazamentos de dados entre tenants — bugs silenciosos e de difícil rastreamento.

---

### Padrão 1 — `$queryRaw` e `$executeRaw`: tenantId explícito obrigatório

A Prisma Client Extension intercepta operações do Prisma Client, mas **NÃO intercepta SQL bruto**. Toda query raw deve incluir filtro explícito por `tenantId`.

```typescript
// ❌ ERRADO — retorna dados de todos os tenants
const resultado = await db.$queryRaw`
  SELECT cidade, COUNT(*) FROM "Paciente"
  WHERE ativo = true GROUP BY cidade
`

// ✅ CORRETO — filtra pelo tenant da request
const tenantId = getTenantId()
const resultado = await db.$queryRaw`
  SELECT cidade, COUNT(*) FROM "Paciente"
  WHERE ativo = true AND "tenantId" = ${tenantId}
  GROUP BY cidade
`
// Nota: Prisma tagged templates tratam ${tenantId} como parâmetro seguro (sem SQL injection)
```

---

### Padrão 2 — `AgendamentoServico` (SKIP_TENANT): filtrar via `agendamento.tenantId`

`AgendamentoServico` não tem `tenantId` direto. A Extension pula a injeção. Toda query deve filtrar via relacionamento.

```typescript
// ❌ ERRADO — retorna registros de todos os tenants
await db.agendamentoServico.groupBy({
  by: ['servicoId'],
  _count: { servicoId: true },
})

// ✅ CORRETO — filtra via agendamento que tem tenantId
const tenantId = getTenantId()
await db.agendamentoServico.groupBy({
  by: ['servicoId'],
  where: { agendamento: { tenantId } },
  _count: { servicoId: true },
})
```

---

### Padrão 3 — `Parcela` (SKIP_TENANT): filtrar via `parcelamento.tenantId`

`Parcela` não tem `tenantId` direto (ver `NOTE` no `schema.prisma`). A Extension pula a injeção. Toda query deve usar o cliente `db` puro com filtro explícito via `parcelamento`.

```typescript
// ❌ ERRADO — retorna parcelas de todos os tenants
await db.parcela.findMany({
  where: { status: 'PENDENTE' },
})

// ✅ CORRETO — filtra via parcelamento que tem tenantId
const tenantId = getTenantId()
await db.parcela.findMany({
  where: {
    status: 'PENDENTE',
    parcelamento: { status: 'ATIVO', tenantId },
  },
})
```

---

### Padrão 4 — Campos `@@unique([campo, tenantId])`: usar `findFirst`, não `findUnique`

Campos que foram convertidos de `@unique` global para `@@unique([campo, tenantId])` **não podem ser usados em `findUnique`** — o Prisma exige a combinação completa do unique composto no `where`. Use `findFirst`; a Extension injeta `tenantId` automaticamente.

Campos afetados:

| Modelo | Campo | Constraint |
|---|---|---|
| `User` | `email` | `@@unique([email, tenantId])` |
| `Profissional` | `slugAgendamento` | `@@unique([slugAgendamento, tenantId])` |
| `Paciente` | `cpf` | `@@unique([cpf, tenantId])` |
| `Sala` | `nome` | `@@unique([nome, tenantId])` |
| `Servico` | `nome` | `@@unique([nome, tenantId])` |

```typescript
// ❌ ERRADO — findUnique exige o compound {email, tenantId} no where
const user = await db.user.findUnique({ where: { email } })

// ✅ CORRETO — findFirst aceita qualquer where; Extension injeta tenantId
const db = getTenantDb()
const user = await db.user.findFirst({ where: { email } })
// SQL gerado: WHERE email = ? AND tenantId = ?
```

---

### Padrão 5 — `$transaction`: tenant funciona automaticamente no `tx`

Dentro do callback de `$transaction`, o parâmetro `tx` é o **cliente estendido** (não o cliente bruto). A injeção de `tenantId` pela Extension funciona em todas as operações dentro da transação. Não é necessário passar `tenantId` manualmente.

```typescript
// ❌ ERRADO — tenantId passado manualmente é redundante (e confuso)
const db = getTenantDb()
await db.$transaction(async (tx) => {
  await tx.comissao.create({
    data: { ...dados, tenantId: getTenantId() }, // desnecessário
  })
})

// ✅ CORRETO — Extension injeta tenantId automaticamente no tx
const db = getTenantDb()
await db.$transaction(async (tx) => {
  await tx.comissao.create({ data: dados }) // tenantId injetado pela Extension
  await tx.transacaoFinanceira.create({ data: outrosDados }) // idem
})
```

**Exceção:** `$queryRaw` dentro de `$transaction` também não é interceptado — aplica o Padrão 1 mesmo dentro de transações.

---

## Resumo das Decisões

| # | Tema | Decisão Recomendada | Complexidade de Implementação |
|---|---|---|---|
| 1 | Multi-tenancy | Shared DB + `tenantId` em 18 tabelas | Alta (migration + schema completo) |
| 2 | Isolamento | Prisma Client Extension + `AsyncLocalStorage` | Média (centralizado, mas afeta todas as server actions) |
| 3 | Roteamento | Subdomínio por tenant (`*.cliniq.com.br`) | Média (middleware + DNS + Vercel Pro) |
| 4 | Pagamento SaaS | Asaas para assinaturas SaaS + Asaas para pacientes (único gateway) | Média (extensão da integração existente + webhook SaaS separado) |
| 5 | Storage | Supabase Storage com path por tenant | Baixa (remover base64, adicionar upload) |
| 6 | E-mail | Resend único com display name por tenant (MVP) | Baixa (MVP) / Média (fase premium) |

---

*Documento gerado em: 2026-05-21*
*Base: análise de `prisma/schema.prisma` (20 models), `lib/auth.ts`, `lib/db.ts` e `SAAS-BRIEF.md`*
