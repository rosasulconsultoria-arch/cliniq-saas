-- CreateTable
CREATE TABLE "ReservaLocal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "vigenciaInicio" TIMESTAMP(3),
    "vigenciaFim" TIMESTAMP(3),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservaLocal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservaLocal_tenantId_idx" ON "ReservaLocal"("tenantId");

-- CreateIndex
CREATE INDEX "ReservaLocal_localId_diaSemana_ativa_idx" ON "ReservaLocal"("localId", "diaSemana", "ativa");

-- CreateIndex
CREATE INDEX "ReservaLocal_profissionalId_idx" ON "ReservaLocal"("profissionalId");

-- AddForeignKey
ALTER TABLE "ReservaLocal" ADD CONSTRAINT "ReservaLocal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaLocal" ADD CONSTRAINT "ReservaLocal_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservaLocal" ADD CONSTRAINT "ReservaLocal_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
