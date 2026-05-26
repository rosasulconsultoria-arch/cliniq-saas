-- AlterTable: Tenant — add subscriptionStatus, avisoPagamento, @unique on asaas fields
ALTER TABLE "Tenant" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "avisoPagamento" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: @unique on asaasCustomerId (nullable — nulls don't compete)
CREATE UNIQUE INDEX "Tenant_asaasCustomerId_key" ON "Tenant"("asaasCustomerId");

-- CreateIndex: @unique on asaasSubscriptionId (nullable — nulls don't compete)
CREATE UNIQUE INDEX "Tenant_asaasSubscriptionId_key" ON "Tenant"("asaasSubscriptionId");

-- AlterTable: SignupDraft — add asaasCustomerId, asaasSubscriptionId for idempotency
ALTER TABLE "SignupDraft" ADD COLUMN "asaasCustomerId" TEXT;
ALTER TABLE "SignupDraft" ADD COLUMN "asaasSubscriptionId" TEXT;
