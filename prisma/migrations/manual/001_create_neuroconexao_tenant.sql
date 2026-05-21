-- ================================================================
-- MIGRATION 001: Criar tenant Neuroconexão e atribuir dados
-- Data: 2026-05-21
-- Contexto: Conversão de single-tenant para multi-tenant SaaS
-- Autor: Rodrigo Rosa
--
-- ATENÇÃO: Execute dentro de uma transação. Em caso de erro,
-- o ROLLBACK automático preserva o estado original.
-- Leia o README.md antes de executar.
-- ================================================================

BEGIN;

-- ── STEP 1: Enums ──────────────────────────────────────────────
-- Idempotente: ignora se já existir (Prisma pode ter criado)

DO $$ BEGIN
  CREATE TYPE "PlanoTenant" AS ENUM ('BASICO', 'PROFISSIONAL', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "StatusTenant" AS ENUM ('TRIAL', 'ATIVO', 'BLOQUEADO', 'CANCELADO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── STEP 2: Tabela Tenant ──────────────────────────────────────
-- Idempotente: CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS "Tenant" (
  "id"                  TEXT          NOT NULL,
  "slug"                TEXT          NOT NULL,
  "nome"                TEXT          NOT NULL,
  "plano"               "PlanoTenant"  NOT NULL DEFAULT 'BASICO',
  "status"              "StatusTenant" NOT NULL DEFAULT 'TRIAL',
  "trialEndsAt"         TIMESTAMP(3),
  "asaasCustomerId"     TEXT,
  "asaasSubscriptionId" TEXT,
  "createdAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

-- ── STEP 3: INSERT tenant Neuroconexão ─────────────────────────
-- ON CONFLICT DO NOTHING: idempotente se executado duas vezes
-- Nota: status = 'ATIVO' (enum StatusTenant, não 'ACTIVE')

INSERT INTO "Tenant" (
  "id", "slug", "nome", "plano", "status", "createdAt", "updatedAt"
) VALUES (
  'tenant_neuroconexao',
  'neuroconexao',
  'Neuroconexão',
  'ENTERPRISE',
  'ATIVO',
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO NOTHING;

-- ── STEP 4: Adicionar colunas tenantId (nullable) ──────────────
-- Adicionadas como nullable para permitir o UPDATE antes do NOT NULL

ALTER TABLE "User"                ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Profissional"        ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Paciente"            ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Sala"                ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Disponibilidade"     ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Bloqueio"            ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Agendamento"         ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CategoriaFinanceira" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TransacaoFinanceira" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Comissao"            ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Parcelamento"        ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Servico"             ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CrmTemplate"         ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "CrmCampanha"         ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "TaxaImposto"         ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "DespesaProfissional" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Aluguel"             ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "ConfigClinica"       ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- ── STEP 5: Popular tenantId em todos os registros ─────────────
-- WHERE tenantId IS NULL: idempotente se executado duas vezes

UPDATE "User"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "Profissional"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "Paciente"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "Sala"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "Disponibilidade"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "Bloqueio"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "Agendamento"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "CategoriaFinanceira"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "TransacaoFinanceira"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "Comissao"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "Parcelamento"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "Servico"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "CrmTemplate"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "CrmCampanha"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "TaxaImposto"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "DespesaProfissional"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "Aluguel"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

UPDATE "ConfigClinica"
  SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'neuroconexao')
  WHERE "tenantId" IS NULL;

-- ── STEP 6: Adicionar NOT NULL + FK em todas as tabelas ────────

-- User
ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "User"
  ADD CONSTRAINT "User_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Profissional
ALTER TABLE "Profissional" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Profissional"
  ADD CONSTRAINT "Profissional_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Paciente
ALTER TABLE "Paciente" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Paciente"
  ADD CONSTRAINT "Paciente_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sala
ALTER TABLE "Sala" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Sala"
  ADD CONSTRAINT "Sala_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Disponibilidade
ALTER TABLE "Disponibilidade" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Disponibilidade"
  ADD CONSTRAINT "Disponibilidade_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bloqueio
ALTER TABLE "Bloqueio" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Bloqueio"
  ADD CONSTRAINT "Bloqueio_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Agendamento
ALTER TABLE "Agendamento" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Agendamento"
  ADD CONSTRAINT "Agendamento_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CategoriaFinanceira
ALTER TABLE "CategoriaFinanceira" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CategoriaFinanceira"
  ADD CONSTRAINT "CategoriaFinanceira_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- TransacaoFinanceira
ALTER TABLE "TransacaoFinanceira" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "TransacaoFinanceira"
  ADD CONSTRAINT "TransacaoFinanceira_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Comissao
ALTER TABLE "Comissao" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Comissao"
  ADD CONSTRAINT "Comissao_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Parcelamento
ALTER TABLE "Parcelamento" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Parcelamento"
  ADD CONSTRAINT "Parcelamento_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Servico
ALTER TABLE "Servico" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Servico"
  ADD CONSTRAINT "Servico_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CrmTemplate
ALTER TABLE "CrmTemplate" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CrmTemplate"
  ADD CONSTRAINT "CrmTemplate_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- CrmCampanha
ALTER TABLE "CrmCampanha" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "CrmCampanha"
  ADD CONSTRAINT "CrmCampanha_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- TaxaImposto
ALTER TABLE "TaxaImposto" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "TaxaImposto"
  ADD CONSTRAINT "TaxaImposto_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- DespesaProfissional
ALTER TABLE "DespesaProfissional" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "DespesaProfissional"
  ADD CONSTRAINT "DespesaProfissional_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Aluguel
ALTER TABLE "Aluguel" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Aluguel"
  ADD CONSTRAINT "Aluguel_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ConfigClinica
ALTER TABLE "ConfigClinica" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ConfigClinica"
  ADD CONSTRAINT "ConfigClinica_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── STEP 7: Converter @unique → @@unique([campo, tenantId]) ────
-- Drop das constraints antigas (nome padrão Prisma: {Model}_{field}_key)
-- Criação das novas constraints compostas

-- User.email
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_tenantId_key"
  ON "User"("email", "tenantId");

-- Profissional.slugAgendamento
ALTER TABLE "Profissional" DROP CONSTRAINT IF EXISTS "Profissional_slugAgendamento_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Profissional_slugAgendamento_tenantId_key"
  ON "Profissional"("slugAgendamento", "tenantId");

-- Paciente.cpf (nullable: NULLs múltiplos são permitidos pelo PostgreSQL)
ALTER TABLE "Paciente" DROP CONSTRAINT IF EXISTS "Paciente_cpf_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Paciente_cpf_tenantId_key"
  ON "Paciente"("cpf", "tenantId");

-- Sala.nome
ALTER TABLE "Sala" DROP CONSTRAINT IF EXISTS "Sala_nome_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Sala_nome_tenantId_key"
  ON "Sala"("nome", "tenantId");

-- Servico.nome
ALTER TABLE "Servico" DROP CONSTRAINT IF EXISTS "Servico_nome_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Servico_nome_tenantId_key"
  ON "Servico"("nome", "tenantId");

-- ── STEP 8: Criar indexes tenantId ─────────────────────────────

CREATE INDEX IF NOT EXISTS "User_tenantId_idx"                ON "User"("tenantId");
CREATE INDEX IF NOT EXISTS "Profissional_tenantId_idx"        ON "Profissional"("tenantId");
CREATE INDEX IF NOT EXISTS "Paciente_tenantId_idx"            ON "Paciente"("tenantId");
CREATE INDEX IF NOT EXISTS "Sala_tenantId_idx"                ON "Sala"("tenantId");
CREATE INDEX IF NOT EXISTS "Disponibilidade_tenantId_idx"     ON "Disponibilidade"("tenantId");
CREATE INDEX IF NOT EXISTS "Bloqueio_tenantId_idx"            ON "Bloqueio"("tenantId");
CREATE INDEX IF NOT EXISTS "Agendamento_tenantId_idx"         ON "Agendamento"("tenantId");
CREATE INDEX IF NOT EXISTS "CategoriaFinanceira_tenantId_idx" ON "CategoriaFinanceira"("tenantId");
CREATE INDEX IF NOT EXISTS "TransacaoFinanceira_tenantId_idx" ON "TransacaoFinanceira"("tenantId");
CREATE INDEX IF NOT EXISTS "Comissao_tenantId_idx"            ON "Comissao"("tenantId");
CREATE INDEX IF NOT EXISTS "Parcelamento_tenantId_idx"        ON "Parcelamento"("tenantId");
CREATE INDEX IF NOT EXISTS "Servico_tenantId_idx"             ON "Servico"("tenantId");
CREATE INDEX IF NOT EXISTS "CrmTemplate_tenantId_idx"         ON "CrmTemplate"("tenantId");
CREATE INDEX IF NOT EXISTS "CrmCampanha_tenantId_idx"         ON "CrmCampanha"("tenantId");
CREATE INDEX IF NOT EXISTS "TaxaImposto_tenantId_idx"         ON "TaxaImposto"("tenantId");
CREATE INDEX IF NOT EXISTS "DespesaProfissional_tenantId_idx" ON "DespesaProfissional"("tenantId");
CREATE INDEX IF NOT EXISTS "Aluguel_tenantId_idx"             ON "Aluguel"("tenantId");
CREATE INDEX IF NOT EXISTS "ConfigClinica_tenantId_idx"       ON "ConfigClinica"("tenantId");

COMMIT;
