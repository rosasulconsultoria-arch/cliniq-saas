-- Migration manual: Sala → Local (Fase 2 — Lote A)
-- Renomeia tabela, coluna e constraints; adiciona novos campos de tipo e localização.
-- NÃO usar prisma migrate reset — gera DROP+CREATE destruindo dados.

BEGIN;

-- 1. Criar enum TipoLocal
CREATE TYPE "TipoLocal" AS ENUM ('SALA', 'ONLINE', 'DOMICILIAR', 'EXTERNO');

-- 2. Renomear tabela Sala → Local
ALTER TABLE "Sala" RENAME TO "Local";

-- 3. Renomear constraints e indexes herdados da tabela Sala
ALTER TABLE "Local" RENAME CONSTRAINT "Sala_pkey"         TO "Local_pkey";
ALTER TABLE "Local" RENAME CONSTRAINT "Sala_tenantId_fkey" TO "Local_tenantId_fkey";
ALTER INDEX "Sala_nome_tenantId_key" RENAME TO "Local_nome_tenantId_key";
ALTER INDEX "Sala_tenantId_idx"      RENAME TO "Local_tenantId_idx";

-- 4. Adicionar novos campos ao Local
ALTER TABLE "Local" ADD COLUMN "tipo"       "TipoLocal" NOT NULL DEFAULT 'SALA';
ALTER TABLE "Local" ADD COLUMN "endereco"   TEXT;
ALTER TABLE "Local" ADD COLUMN "linkPadrao" TEXT;
ALTER TABLE "Local" ADD COLUMN "instrucoes" TEXT;

-- 5. Tornar capacidade nullable (era INT NOT NULL DEFAULT 1)
ALTER TABLE "Local" ALTER COLUMN "capacidade" DROP NOT NULL;
ALTER TABLE "Local" ALTER COLUMN "capacidade" DROP DEFAULT;

-- 6. Migrar dados: todas as salas existentes viram tipo=SALA (já garantido pelo DEFAULT acima)

-- 7. Renomear coluna salaId → localId em Agendamento
ALTER TABLE "Agendamento" RENAME COLUMN "salaId" TO "localId";

-- 8. Renomear FK e index de Agendamento
ALTER TABLE "Agendamento" RENAME CONSTRAINT "Agendamento_salaId_fkey" TO "Agendamento_localId_fkey";
ALTER INDEX "Agendamento_salaId_idx" RENAME TO "Agendamento_localId_idx";

COMMIT;
