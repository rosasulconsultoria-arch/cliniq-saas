-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "tourCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "avisoPagamentoDesde" TIMESTAMP(3);
