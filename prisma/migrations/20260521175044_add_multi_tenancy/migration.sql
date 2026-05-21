
-- CreateEnum
CREATE TYPE "PlanoTenant" AS ENUM ('BASICO', 'PROFISSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "StatusTenant" AS ENUM ('TRIAL', 'ATIVO', 'BLOQUEADO', 'CANCELADO');

-- DropIndex
DROP INDEX "Paciente_cpf_key";

-- DropIndex
DROP INDEX "Profissional_slugAgendamento_key";

-- DropIndex
DROP INDEX "Sala_nome_key";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "asaasInvoiceUrl" TEXT,
ADD COLUMN     "asaasPaymentId" TEXT,
ADD COLUMN     "asaasPaymentStatus" TEXT,
ADD COLUMN     "bandeiraCartao" TEXT,
ADD COLUMN     "confirmacaoEnviada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "formaPagamento" TEXT,
ADD COLUMN     "lembreteEnviado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "numeroParcelas" INTEGER DEFAULT 1,
ADD COLUMN     "recorrenciaGrupoId" TEXT,
ADD COLUMN     "taxaCartaoPerc" DECIMAL(5,2),
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "tipoCobranca" TEXT NOT NULL DEFAULT 'CONSULTA',
ADD COLUMN     "totalSessoes" INTEGER;

-- AlterTable
ALTER TABLE "Aluguel" ADD COLUMN     "formaPagamento" TEXT,
ADD COLUMN     "observacao" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Bloqueio" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CategoriaFinanceira" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Comissao" ADD COLUMN     "formaPagamento" TEXT,
ADD COLUMN     "observacao" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Disponibilidade" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Paciente" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" TEXT,
ADD COLUMN     "cidade" TEXT,
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "endereco" TEXT,
ADD COLUMN     "estado" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ALTER COLUMN "cpf" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Profissional" ADD COLUMN     "asaasApiKey" TEXT,
ADD COLUMN     "fotoBase64" TEXT,
ADD COLUMN     "mesesContrato" INTEGER,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sala" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TransacaoFinanceira" ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3),
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "plano" "PlanoTenant" NOT NULL DEFAULT 'BASICO',
    "status" "StatusTenant" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "asaasCustomerId" TEXT,
    "asaasSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcelamento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "agendamentoId" TEXT,
    "descricao" TEXT NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "bandeira" TEXT NOT NULL,
    "tipoPagamento" TEXT NOT NULL,
    "taxaCartao" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalParcelas" INTEGER NOT NULL,
    "valorLiquido" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parcelamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parcela" (
    "id" TEXT NOT NULL,
    "parcelamentoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "dataVencimento" DATE NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" TIMESTAMP(3),

    CONSTRAINT "Parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigClinica" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL DEFAULT 'Clínica de Psicologia',
    "logoBase64" TEXT,
    "corPrimaria" TEXT NOT NULL DEFAULT '#4f46e5',
    "cnpj" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigClinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendamentoServico" (
    "agendamentoId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,

    CONSTRAINT "AgendamentoServico_pkey" PRIMARY KEY ("agendamentoId","servicoId")
);

-- CreateTable
CREATE TABLE "CrmTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "assunto" TEXT,
    "corpo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmCampanha" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "assunto" TEXT,
    "filtros" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RASCUNHO',
    "totalEnviado" INTEGER NOT NULL DEFAULT 0,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmCampanha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxaImposto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "aliquota" DECIMAL(5,2),
    "valorFixo" DECIMAL(10,2),
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxaImposto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DespesaProfissional" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" DATE NOT NULL,
    "categoria" TEXT NOT NULL,
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'PENDENTE',
    "formaPagamento" TEXT,
    "dataPagamento" TIMESTAMP(3),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DespesaProfissional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Parcelamento_tenantId_idx" ON "Parcelamento"("tenantId");

-- CreateIndex
CREATE INDEX "Parcelamento_profissionalId_idx" ON "Parcelamento"("profissionalId");

-- CreateIndex
CREATE INDEX "Parcela_parcelamentoId_idx" ON "Parcela"("parcelamentoId");

-- CreateIndex
CREATE INDEX "Parcela_dataVencimento_idx" ON "Parcela"("dataVencimento");

-- CreateIndex
CREATE INDEX "ConfigClinica_tenantId_idx" ON "ConfigClinica"("tenantId");

-- CreateIndex
CREATE INDEX "Servico_tenantId_idx" ON "Servico"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Servico_nome_tenantId_key" ON "Servico"("nome", "tenantId");

-- CreateIndex
CREATE INDEX "AgendamentoServico_servicoId_idx" ON "AgendamentoServico"("servicoId");

-- CreateIndex
CREATE INDEX "CrmTemplate_tenantId_idx" ON "CrmTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "CrmCampanha_tenantId_idx" ON "CrmCampanha"("tenantId");

-- CreateIndex
CREATE INDEX "TaxaImposto_tenantId_idx" ON "TaxaImposto"("tenantId");

-- CreateIndex
CREATE INDEX "TaxaImposto_tipo_idx" ON "TaxaImposto"("tipo");

-- CreateIndex
CREATE INDEX "DespesaProfissional_tenantId_idx" ON "DespesaProfissional"("tenantId");

-- CreateIndex
CREATE INDEX "DespesaProfissional_profissionalId_idx" ON "DespesaProfissional"("profissionalId");

-- CreateIndex
CREATE INDEX "DespesaProfissional_data_idx" ON "DespesaProfissional"("data");

-- CreateIndex
CREATE INDEX "Agendamento_tenantId_idx" ON "Agendamento"("tenantId");

-- CreateIndex
CREATE INDEX "Agendamento_recorrenciaGrupoId_idx" ON "Agendamento"("recorrenciaGrupoId");

-- CreateIndex
CREATE INDEX "Aluguel_tenantId_idx" ON "Aluguel"("tenantId");

-- CreateIndex
CREATE INDEX "Bloqueio_tenantId_idx" ON "Bloqueio"("tenantId");

-- CreateIndex
CREATE INDEX "CategoriaFinanceira_tenantId_idx" ON "CategoriaFinanceira"("tenantId");

-- CreateIndex
CREATE INDEX "Comissao_tenantId_idx" ON "Comissao"("tenantId");

-- CreateIndex
CREATE INDEX "Disponibilidade_tenantId_idx" ON "Disponibilidade"("tenantId");

-- CreateIndex
CREATE INDEX "Paciente_tenantId_idx" ON "Paciente"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_cpf_tenantId_key" ON "Paciente"("cpf", "tenantId");

-- CreateIndex
CREATE INDEX "Profissional_tenantId_idx" ON "Profissional"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Profissional_slugAgendamento_tenantId_key" ON "Profissional"("slugAgendamento", "tenantId");

-- CreateIndex
CREATE INDEX "Sala_tenantId_idx" ON "Sala"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Sala_nome_tenantId_key" ON "Sala"("nome", "tenantId");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_tenantId_idx" ON "TransacaoFinanceira"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_resetToken_idx" ON "User"("resetToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_tenantId_key" ON "User"("email", "tenantId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profissional" ADD CONSTRAINT "Profissional_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sala" ADD CONSTRAINT "Sala_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disponibilidade" ADD CONSTRAINT "Disponibilidade_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoriaFinanceira" ADD CONSTRAINT "CategoriaFinanceira_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoFinanceira" ADD CONSTRAINT "TransacaoFinanceira_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcelamento" ADD CONSTRAINT "Parcelamento_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_parcelamentoId_fkey" FOREIGN KEY ("parcelamentoId") REFERENCES "Parcelamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigClinica" ADD CONSTRAINT "ConfigClinica_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendamentoServico" ADD CONSTRAINT "AgendamentoServico_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendamentoServico" ADD CONSTRAINT "AgendamentoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmTemplate" ADD CONSTRAINT "CrmTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmCampanha" ADD CONSTRAINT "CrmCampanha_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxaImposto" ADD CONSTRAINT "TaxaImposto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DespesaProfissional" ADD CONSTRAINT "DespesaProfissional_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DespesaProfissional" ADD CONSTRAINT "DespesaProfissional_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluguel" ADD CONSTRAINT "Aluguel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

