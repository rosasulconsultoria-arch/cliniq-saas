-- ================================================================
-- 001a — Seed do tenant Neuroconexão
--
-- USO: executar em qualquer banco APÓS o schema já estar criado
-- (prisma migrate dev/deploy já rodou e as tabelas existem).
--
-- Aplicável em: dev local, staging, produção (pós-migrate)
-- NÃO aplicável em: banco com dados existentes pre-SaaS
-- → Para banco com dados existentes, ver 001b_migrate_existing_data.sql
-- ================================================================

INSERT INTO "Tenant" ("id", "slug", "nome", "plano", "status", "createdAt", "updatedAt")
VALUES (
  'tenant_neuroconexao',
  'neuroconexao',
  'Neuroconexão',
  'ENTERPRISE',
  'ATIVO',
  NOW(),
  NOW()
)
ON CONFLICT ("slug") DO NOTHING;
