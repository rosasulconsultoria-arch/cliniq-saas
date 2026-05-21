# Migrações Manuais — Multi-tenancy

Este diretório contém migrações SQL executadas manualmente, fora do fluxo normal do `prisma migrate`. São usadas quando a migration envolve dados de produção que precisam de atenção explícita.

---

## 001 — Criar tenant Neuroconexão e atribuir dados existentes

**Arquivo:** `001_create_neuroconexao_tenant.sql`
**Contexto:** Conversão do sistema de single-tenant para SaaS multi-tenant. Todos os dados existentes pertencem à Neuroconexão e devem ser atribuídos ao novo tenant.

---

## Pré-requisitos

- Acesso direto ao banco PostgreSQL de produção (psql, DBeaver, Supabase SQL Editor)
- Backup realizado (ver seção abaixo)
- Aplicação **offline** ou em modo de manutenção durante a execução

---

## Backup antes de executar

Execute no banco de produção antes de qualquer alteração:

```sql
-- Verificar contagem atual (anotar os números para conferência pós-migração)
SELECT
  (SELECT COUNT(*) FROM "User")                AS users,
  (SELECT COUNT(*) FROM "Profissional")        AS profissionais,
  (SELECT COUNT(*) FROM "Paciente")            AS pacientes,
  (SELECT COUNT(*) FROM "Agendamento")         AS agendamentos,
  (SELECT COUNT(*) FROM "TransacaoFinanceira") AS transacoes,
  (SELECT COUNT(*) FROM "Comissao")            AS comissoes;
```

Se estiver no Supabase, use o painel **Backups** para criar um snapshot manual antes de prosseguir. Se estiver em servidor próprio:

```bash
pg_dump $DATABASE_URL > backup_pre_multitenancy_$(date +%Y%m%d_%H%M%S).sql
```

---

## Ordem de execução

Esta migration é **autocontida** — cobre schema e dados em uma única transação. Não depende de nenhuma outra migration.

### Passo 1 — Colocar aplicação offline

Garanta que nenhuma request chegue ao banco durante a migration. No Vercel, ative o modo de manutenção ou pause os deployments.

### Passo 2 — Conferir que não há Prisma migration pendente conflitante

```bash
npx prisma migrate status
```

Se houver migrations pendentes geradas pelo Prisma que adicionem `tenantId`, **não as execute** antes deste SQL — este arquivo já faz o mesmo trabalho de forma manual e controlada.

### Passo 3 — Executar o SQL

No Supabase SQL Editor ou via psql:

```bash
psql $DATABASE_URL -f prisma/migrations/manual/001_create_neuroconexao_tenant.sql
```

O script roda dentro de um `BEGIN/COMMIT`. Se qualquer statement falhar, o ROLLBACK é automático e o banco fica inalterado.

### Passo 4 — Verificar (sanity checks abaixo)

### Passo 5 — Marcar no Prisma que a migration foi aplicada

Para o Prisma não tentar re-aplicar as mesmas mudanças:

```bash
npx prisma migrate resolve --applied "nome_da_migration_gerada"
```

Ou, se você preferir criar uma migration vazia para registrar o baseline:

```bash
npx prisma migrate dev --create-only --name "multitenancy_baseline"
# Substitua o conteúdo do arquivo gerado por: -- migration aplicada manualmente (001_create_neuroconexao_tenant.sql)
npx prisma migrate deploy
```

---

## Sanity checks pós-migração

Execute estas queries após a migration e confirme que os resultados fazem sentido:

```sql
-- 1. Tenant criado corretamente
SELECT id, slug, nome, plano, status FROM "Tenant";
-- Esperado: 1 linha, slug='neuroconexao', plano='ENTERPRISE', status='ATIVO'

-- 2. Todos os registros têm tenantId (nenhum NULL)
SELECT
  (SELECT COUNT(*) FROM "User"                WHERE "tenantId" IS NULL) AS user_sem_tenant,
  (SELECT COUNT(*) FROM "Profissional"        WHERE "tenantId" IS NULL) AS prof_sem_tenant,
  (SELECT COUNT(*) FROM "Paciente"            WHERE "tenantId" IS NULL) AS pac_sem_tenant,
  (SELECT COUNT(*) FROM "Sala"                WHERE "tenantId" IS NULL) AS sala_sem_tenant,
  (SELECT COUNT(*) FROM "Disponibilidade"     WHERE "tenantId" IS NULL) AS disp_sem_tenant,
  (SELECT COUNT(*) FROM "Bloqueio"            WHERE "tenantId" IS NULL) AS bloq_sem_tenant,
  (SELECT COUNT(*) FROM "Agendamento"         WHERE "tenantId" IS NULL) AS agend_sem_tenant,
  (SELECT COUNT(*) FROM "CategoriaFinanceira" WHERE "tenantId" IS NULL) AS cat_sem_tenant,
  (SELECT COUNT(*) FROM "TransacaoFinanceira" WHERE "tenantId" IS NULL) AS transac_sem_tenant,
  (SELECT COUNT(*) FROM "Comissao"            WHERE "tenantId" IS NULL) AS com_sem_tenant,
  (SELECT COUNT(*) FROM "Parcelamento"        WHERE "tenantId" IS NULL) AS parc_sem_tenant,
  (SELECT COUNT(*) FROM "Servico"             WHERE "tenantId" IS NULL) AS serv_sem_tenant,
  (SELECT COUNT(*) FROM "CrmTemplate"         WHERE "tenantId" IS NULL) AS crmt_sem_tenant,
  (SELECT COUNT(*) FROM "CrmCampanha"         WHERE "tenantId" IS NULL) AS crmc_sem_tenant,
  (SELECT COUNT(*) FROM "TaxaImposto"         WHERE "tenantId" IS NULL) AS taxa_sem_tenant,
  (SELECT COUNT(*) FROM "DespesaProfissional" WHERE "tenantId" IS NULL) AS desp_sem_tenant,
  (SELECT COUNT(*) FROM "Aluguel"             WHERE "tenantId" IS NULL) AS alug_sem_tenant,
  (SELECT COUNT(*) FROM "ConfigClinica"       WHERE "tenantId" IS NULL) AS config_sem_tenant;
-- Esperado: todos os valores = 0

-- 3. Contagens batem com o pré-migração
SELECT
  (SELECT COUNT(*) FROM "User")                AS users,
  (SELECT COUNT(*) FROM "Profissional")        AS profissionais,
  (SELECT COUNT(*) FROM "Paciente")            AS pacientes,
  (SELECT COUNT(*) FROM "Agendamento")         AS agendamentos,
  (SELECT COUNT(*) FROM "TransacaoFinanceira") AS transacoes,
  (SELECT COUNT(*) FROM "Comissao")            AS comissoes;
-- Esperado: mesmos números de antes da migration

-- 4. Unique constraints compostos funcionando
-- (deve retornar erro se tentar inserir email duplicado no mesmo tenant)
-- Conferir via \d "User" no psql ou inspecionando índices no Supabase

-- 5. FK íntegra
SELECT COUNT(*) FROM "User" u
LEFT JOIN "Tenant" t ON u."tenantId" = t.id
WHERE t.id IS NULL;
-- Esperado: 0
```

---

## Rollback

Se algo der errado **durante** a execução, o `ROLLBACK` é automático (o script usa `BEGIN/COMMIT`).

Se algo for detectado **após** o `COMMIT`, execute o script de rollback abaixo. Ele desfaz todas as alterações desta migration:

```sql
BEGIN;

-- Remover FKs
ALTER TABLE "User"                DROP CONSTRAINT IF EXISTS "User_tenantId_fkey";
ALTER TABLE "Profissional"        DROP CONSTRAINT IF EXISTS "Profissional_tenantId_fkey";
ALTER TABLE "Paciente"            DROP CONSTRAINT IF EXISTS "Paciente_tenantId_fkey";
ALTER TABLE "Sala"                DROP CONSTRAINT IF EXISTS "Sala_tenantId_fkey";
ALTER TABLE "Disponibilidade"     DROP CONSTRAINT IF EXISTS "Disponibilidade_tenantId_fkey";
ALTER TABLE "Bloqueio"            DROP CONSTRAINT IF EXISTS "Bloqueio_tenantId_fkey";
ALTER TABLE "Agendamento"         DROP CONSTRAINT IF EXISTS "Agendamento_tenantId_fkey";
ALTER TABLE "CategoriaFinanceira" DROP CONSTRAINT IF EXISTS "CategoriaFinanceira_tenantId_fkey";
ALTER TABLE "TransacaoFinanceira" DROP CONSTRAINT IF EXISTS "TransacaoFinanceira_tenantId_fkey";
ALTER TABLE "Comissao"            DROP CONSTRAINT IF EXISTS "Comissao_tenantId_fkey";
ALTER TABLE "Parcelamento"        DROP CONSTRAINT IF EXISTS "Parcelamento_tenantId_fkey";
ALTER TABLE "Servico"             DROP CONSTRAINT IF EXISTS "Servico_tenantId_fkey";
ALTER TABLE "CrmTemplate"         DROP CONSTRAINT IF EXISTS "CrmTemplate_tenantId_fkey";
ALTER TABLE "CrmCampanha"         DROP CONSTRAINT IF EXISTS "CrmCampanha_tenantId_fkey";
ALTER TABLE "TaxaImposto"         DROP CONSTRAINT IF EXISTS "TaxaImposto_tenantId_fkey";
ALTER TABLE "DespesaProfissional" DROP CONSTRAINT IF EXISTS "DespesaProfissional_tenantId_fkey";
ALTER TABLE "Aluguel"             DROP CONSTRAINT IF EXISTS "Aluguel_tenantId_fkey";
ALTER TABLE "ConfigClinica"       DROP CONSTRAINT IF EXISTS "ConfigClinica_tenantId_fkey";

-- Remover indexes tenantId
DROP INDEX IF EXISTS "User_tenantId_idx";
DROP INDEX IF EXISTS "Profissional_tenantId_idx";
DROP INDEX IF EXISTS "Paciente_tenantId_idx";
DROP INDEX IF EXISTS "Sala_tenantId_idx";
DROP INDEX IF EXISTS "Disponibilidade_tenantId_idx";
DROP INDEX IF EXISTS "Bloqueio_tenantId_idx";
DROP INDEX IF EXISTS "Agendamento_tenantId_idx";
DROP INDEX IF EXISTS "CategoriaFinanceira_tenantId_idx";
DROP INDEX IF EXISTS "TransacaoFinanceira_tenantId_idx";
DROP INDEX IF EXISTS "Comissao_tenantId_idx";
DROP INDEX IF EXISTS "Parcelamento_tenantId_idx";
DROP INDEX IF EXISTS "Servico_tenantId_idx";
DROP INDEX IF EXISTS "CrmTemplate_tenantId_idx";
DROP INDEX IF EXISTS "CrmCampanha_tenantId_idx";
DROP INDEX IF EXISTS "TaxaImposto_tenantId_idx";
DROP INDEX IF EXISTS "DespesaProfissional_tenantId_idx";
DROP INDEX IF EXISTS "Aluguel_tenantId_idx";
DROP INDEX IF EXISTS "ConfigClinica_tenantId_idx";

-- Restaurar unique constraints originais
DROP INDEX IF EXISTS "User_email_tenantId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

DROP INDEX IF EXISTS "Profissional_slugAgendamento_tenantId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Profissional_slugAgendamento_key" ON "Profissional"("slugAgendamento");

DROP INDEX IF EXISTS "Paciente_cpf_tenantId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Paciente_cpf_key" ON "Paciente"("cpf");

DROP INDEX IF EXISTS "Sala_nome_tenantId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Sala_nome_key" ON "Sala"("nome");

DROP INDEX IF EXISTS "Servico_nome_tenantId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Servico_nome_key" ON "Servico"("nome");

-- Remover colunas tenantId
ALTER TABLE "User"                DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Profissional"        DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Paciente"            DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Sala"                DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Disponibilidade"     DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Bloqueio"            DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Agendamento"         DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "CategoriaFinanceira" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "TransacaoFinanceira" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Comissao"            DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Parcelamento"        DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Servico"             DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "CrmTemplate"         DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "CrmCampanha"         DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "TaxaImposto"         DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "DespesaProfissional" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "Aluguel"             DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "ConfigClinica"       DROP COLUMN IF EXISTS "tenantId";

-- Remover tabela e enums
DROP TABLE IF EXISTS "Tenant";
DROP TYPE IF EXISTS "PlanoTenant";
DROP TYPE IF EXISTS "StatusTenant";

COMMIT;
```

---

## Notas importantes

- **`ConfigClinica.id`**: o schema foi atualizado de `@default("default")` para `@default(cuid())`. O registro existente com `id = 'default'` permanece válido — nenhuma alteração no id é necessária nesta migration.
- **`Paciente.cpf` nullable**: a constraint `@@unique([cpf, tenantId])` permite múltiplos pacientes sem CPF (NULL) no mesmo tenant, pois NULLs não são considerados iguais pelo PostgreSQL.
- **`Parcela` e `AgendamentoServico`**: não recebem `tenantId` — acessadas sempre via FK de parent que já tem tenant filtrado.
