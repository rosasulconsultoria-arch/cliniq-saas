-- ================================================================
-- 001b — Migração de dados existentes para multi-tenant (PRODUÇÃO)
--
-- USO: executar APENAS em banco com dados existentes (pre-SaaS),
-- DEPOIS de 001a_seed_dev_tenant.sql já ter inserido o tenant.
--
-- Pré-requisitos:
--   1. prisma migrate deploy (schema novo aplicado ao banco existente)
--   2. 001a_seed_dev_tenant.sql executado (tenant Neuroconexão inserido)
--   3. Backup realizado (ver README.md)
--
-- Este script atribui o tenant aos dados existentes, adiciona FKs e ajusta
-- constraints @unique que foram convertidas para @@unique([campo, tenantId]).
-- ================================================================

BEGIN;

-- ── STEP 1: Popular tenantId em todos os registros existentes ──
-- WHERE tenantId IS NULL: idempotente se executado mais de uma vez

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

-- ── STEP 2: Verificação pré-constraint ─────────────────────────
-- Garante que não sobrou nenhum registro sem tenantId antes de adicionar NOT NULL
DO $$
DECLARE
  v_nulls INT;
BEGIN
  SELECT (
    (SELECT COUNT(*) FROM "User"                WHERE "tenantId" IS NULL) +
    (SELECT COUNT(*) FROM "Profissional"        WHERE "tenantId" IS NULL) +
    (SELECT COUNT(*) FROM "Paciente"            WHERE "tenantId" IS NULL) +
    (SELECT COUNT(*) FROM "Agendamento"         WHERE "tenantId" IS NULL)
  ) INTO v_nulls;

  IF v_nulls > 0 THEN
    RAISE EXCEPTION 'Ainda existem % registros sem tenantId. Verifique antes de continuar.', v_nulls;
  END IF;
END $$;

COMMIT;
