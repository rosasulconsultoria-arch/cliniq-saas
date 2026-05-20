# Briefing — Produto SaaS para Gestão de Clínicas de Saúde

## Contexto

Este documento descreve um produto SaaS a ser construído com base em um sistema de gestão clínica já funcional e em produção. O sistema atual foi desenvolvido para uma clínica de psicologia real (Neuroconexão) e já possui todas as funcionalidades core validadas. O objetivo agora é transformá-lo em uma plataforma multi-tenant comercializável para qualquer clínica de saúde.

---

## Sistema existente (ponto de partida)

### Stack atual
- **Frontend/Backend:** Next.js 14+ (App Router) + TypeScript
- **Banco de dados:** PostgreSQL + Prisma ORM
- **Autenticação:** NextAuth.js v5 (Auth.js)
- **UI:** Tailwind CSS + shadcn/ui
- **Gráficos:** Recharts
- **Validação:** Zod
- **E-mail:** Resend
- **Hosting:** Vercel (frontend) + Supabase (banco)
- **PDF:** jsPDF (client-side)

### Funcionalidades já implementadas e validadas
- **Autenticação completa:** login, troca de senha obrigatória no primeiro acesso, recuperação de senha por e-mail com token
- **3 perfis de acesso:** ADMIN (acesso total), PROFISSIONAL (agenda e comissões próprias), RECEPCAO (agenda e cadastros)
- **Gestão de profissionais:** dois modelos de vínculo — COMISSIONADO (% por consulta) ou LOCATARIO (aluguel fixo de sala)
- **Agenda:** agendamento com validação de conflito de sala e profissional, recorrência, bloqueios, múltiplos status (agendado, confirmado, realizado, cancelado, faltou)
- **Agendamento público:** página `/agendar/[slug]` sem login, identifica paciente por CPF, cria se não existir
- **Gestão de clientes (pacientes):** cadastro completo com endereço, dados pessoais, histórico de consultas
- **Financeiro completo:** receitas, despesas, investimentos, comissões automáticas, aluguéis mensais, parcelamentos, filtros por período
- **Recibos em PDF:** geração client-side com dados da clínica, paciente, profissional e assinaturas
- **Relatórios:** exportação em PDF e CSV
- **Configurações da clínica:** nome, logo, CNPJ, endereço, cores, dados para recibos
- **Notificações por e-mail:** confirmação de agendamento e lembrete 24h antes
- **Dashboard financeiro:** KPIs com filtro de período (1, 3, 6, 12 meses), gráficos
- **CRM básico:** templates de mensagem, campanhas
- **PWA:** manifest, ícone customizável, funciona como app no iPhone e Android

---

## O que precisa ser construído para o SaaS

### 1. Multi-tenancy (prioridade máxima)
O sistema atual opera com uma única clínica hardcoded. Para o SaaS, cada clínica precisa ser um **tenant** isolado.

**Decisão arquitetural a definir:**
- **Shared database, shared schema** com `tenantId` em todas as tabelas — mais simples, mais barato, escala bem
- **Shared database, schemas isolados** — um schema PostgreSQL por tenant — isolamento melhor, mais complexo
- **Database por tenant** — máximo isolamento, custo alto

Recomendação provável: shared database + `tenantId` para começar.

**Impacto:** todas as queries Prisma precisam filtrar por `tenantId`. Middleware de tenant precisa identificar a clínica pela URL (subdomínio ou slug).

### 2. Onboarding self-service
- Cadastro da clínica (nome, especialidade, responsável, e-mail, telefone)
- Criação automática do primeiro usuário ADMIN
- Configuração guiada (logo, cores, profissionais iniciais)
- Trial gratuito (ex: 14 dias sem cartão)

### 3. Planos e cobrança
- Definição de planos (ex: Básico, Profissional, Enterprise) com limites por plano (número de profissionais, agendamentos/mês, funcionalidades)
- Integração com gateway de pagamento (Stripe ou Pagar.me para Brasil)
- Cobrança recorrente mensal/anual
- Gestão de inadimplência (bloqueio de acesso, notificações)
- Portal do cliente para gerenciar assinatura

### 4. Roteamento por tenant
- Subdomínio por clínica: `neuroconexao.seuapp.com.br`, `clinicaxyz.seuapp.com.br`
- Ou path-based: `seuapp.com.br/neuroconexao`
- A página de agendamento público `/agendar/[slug]` já usa slug — compatível

### 5. Painel super-admin
- Visão de todos os tenants
- Métricas de uso por tenant
- Gerenciamento de planos e cobranças
- Suporte e impersonação de contas

### 6. Landing page
- Apresentação do produto
- Comparativo de planos
- CTA para trial gratuito
- Depoimentos / casos de uso

---

## Mercado-alvo

**Primário:** Clínicas de psicologia (produto já validado nesse nicho)

**Expansão:** Qualquer clínica de saúde — psiquiatria, terapia ocupacional, fonoaudiologia, nutrição, fisioterapia. O modelo de negócio (profissional comissionado ou locatário de sala) é universal em clínicas.

**Diferenciais competitivos a destacar:**
- Agendamento público sem login para pacientes (URL compartilhável por WhatsApp)
- Dois modelos de vínculo profissional (comissão % ou aluguel de sala)
- Financeiro integrado com comissões automáticas
- Recibos em PDF gerados no cliente (sem servidor)
- PWA — funciona como app sem precisar publicar na App Store

---

## Sugestões de nome para o produto

| Nome | Conceito |
|---|---|
| **Cliniq** | Simples, memorável, remetente a clínica |
| **Agendei** | Foco na funcionalidade principal |
| **PsiGest** | Direto ao nicho de psicologia |
| **Cliniflow** | Fluxo de gestão clínica |
| **Salutis** | Latim para "saúde" — elegante |
| **MediDesk** | Mesa de controle da clínica |

---

## Desafios técnicos principais

1. **Migração do schema atual para multi-tenant** — adicionar `tenantId` em todas as 20+ tabelas sem quebrar o sistema existente
2. **Isolamento de dados** — garantir que nenhuma query retorne dados de outro tenant (middleware Prisma ou extensão de contexto)
3. **Subdomínios dinâmicos no Vercel** — configurar wildcard DNS + Next.js middleware para resolver tenant pelo host
4. **Logo e assets por tenant** — armazenamento de arquivos (Supabase Storage ou S3)
5. **E-mail por tenant** — cada clínica enviando e-mails com seu próprio nome/domínio

---

## Como usar este documento com o Claude

Este briefing contém todo o contexto necessário. Para cada fase do produto, forneça este arquivo ao Claude e use prompts como:

- _"Com base no SAAS-BRIEF.md, crie o ROADMAP.md com as fases do produto priorizando multi-tenancy"_
- _"Com base no SAAS-BRIEF.md, projete o schema Prisma multi-tenant com shared database + tenantId"_
- _"Com base no SAAS-BRIEF.md, crie o plano de migração do sistema atual para multi-tenant sem downtime"_
- _"Com base no SAAS-BRIEF.md, estruture o onboarding self-service — fluxo, telas e actions necessárias"_
- _"Com base no SAAS-BRIEF.md, integre Stripe para cobrança recorrente com planos Básico e Profissional"_

---

## Repositório de referência

O sistema atual (single-tenant, produção) está em:
`https://github.com/rosasulconsultoria-arch/clinica-psi`

Stack idêntica recomendada para o SaaS — apenas expande o que já existe.
