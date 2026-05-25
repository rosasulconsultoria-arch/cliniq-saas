-- CreateTable
CREATE TABLE "SignupDraft" (
    "id" TEXT NOT NULL,
    "planoId" "PlanoTenant",
    "periodicidade" "Periodicidade",
    "nomeClinica" TEXT,
    "slug" TEXT,
    "especialidade" TEXT,
    "telefone" TEXT,
    "nomeAdmin" TEXT,
    "emailAdmin" TEXT,
    "passwordHash" TEXT,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "emailToken" TEXT,
    "emailTokenExp" TIMESTAMP(3),
    "step" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastEmailSentAt" TIMESTAMP(3),
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizing" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignupDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignupDraft_slug_key" ON "SignupDraft"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SignupDraft_emailToken_key" ON "SignupDraft"("emailToken");

-- CreateIndex
CREATE INDEX "SignupDraft_slug_idx" ON "SignupDraft"("slug");

-- CreateIndex
CREATE INDEX "SignupDraft_emailToken_idx" ON "SignupDraft"("emailToken");

-- CreateIndex
CREATE INDEX "SignupDraft_expiresAt_idx" ON "SignupDraft"("expiresAt");
