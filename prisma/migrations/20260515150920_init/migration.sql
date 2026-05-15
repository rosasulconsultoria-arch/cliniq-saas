-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PROFISSIONAL', 'RECEPCAO');

-- CreateEnum
CREATE TYPE "TipoVinculo" AS ENUM ('COMISSIONADO', 'LOCATARIO');

-- CreateEnum
CREATE TYPE "StatusAgendamento" AS ENUM ('AGENDADO', 'CONFIRMADO', 'REALIZADO', 'CANCELADO', 'FALTOU');

-- CreateEnum
CREATE TYPE "OrigemAgendamento" AS ENUM ('PUBLICO', 'INTERNO');

-- CreateEnum
CREATE TYPE "TipoFinanceiro" AS ENUM ('RECEITA', 'DESPESA', 'INVESTIMENTO');

-- CreateEnum
CREATE TYPE "StatusFinanceiro" AS ENUM ('PENDENTE', 'PAGO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'RECEPCAO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profissional" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "crp" TEXT,
    "tipoVinculo" "TipoVinculo" NOT NULL,
    "comissaoPercentual" DECIMAL(5,2),
    "valorAluguelMensal" DECIMAL(10,2),
    "slugAgendamento" TEXT NOT NULL,
    "bio" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profissional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "genero" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sala" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL DEFAULT 1,
    "descricao" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sala_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disponibilidade" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,

    CONSTRAINT "Disponibilidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bloqueio" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "dataHoraFim" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,

    CONSTRAINT "Bloqueio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "dataHoraInicio" TIMESTAMP(3) NOT NULL,
    "dataHoraFim" TIMESTAMP(3) NOT NULL,
    "status" "StatusAgendamento" NOT NULL DEFAULT 'AGENDADO',
    "valor" DECIMAL(10,2) NOT NULL,
    "origem" "OrigemAgendamento" NOT NULL DEFAULT 'INTERNO',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaFinanceira" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoFinanceiro" NOT NULL,
    "cor" TEXT NOT NULL,

    CONSTRAINT "CategoriaFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransacaoFinanceira" (
    "id" TEXT NOT NULL,
    "tipo" "TipoFinanceiro" NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "formaPagamento" TEXT,
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'PENDENTE',
    "profissionalId" TEXT,
    "agendamentoId" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransacaoFinanceira_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comissao" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "agendamentoId" TEXT NOT NULL,
    "valorBruto" DECIMAL(10,2) NOT NULL,
    "percentual" DECIMAL(5,2) NOT NULL,
    "valorComissao" DECIMAL(10,2) NOT NULL,
    "valorClinica" DECIMAL(10,2) NOT NULL,
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" TIMESTAMP(3),

    CONSTRAINT "Comissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aluguel" (
    "id" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "mesReferencia" DATE NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusFinanceiro" NOT NULL DEFAULT 'PENDENTE',
    "dataPagamento" TIMESTAMP(3),

    CONSTRAINT "Aluguel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profissional_userId_key" ON "Profissional"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profissional_slugAgendamento_key" ON "Profissional"("slugAgendamento");

-- CreateIndex
CREATE INDEX "Profissional_slugAgendamento_idx" ON "Profissional"("slugAgendamento");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_cpf_key" ON "Paciente"("cpf");

-- CreateIndex
CREATE INDEX "Paciente_cpf_idx" ON "Paciente"("cpf");

-- CreateIndex
CREATE INDEX "Paciente_nome_idx" ON "Paciente"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Sala_nome_key" ON "Sala"("nome");

-- CreateIndex
CREATE INDEX "Disponibilidade_profissionalId_idx" ON "Disponibilidade"("profissionalId");

-- CreateIndex
CREATE INDEX "Bloqueio_profissionalId_idx" ON "Bloqueio"("profissionalId");

-- CreateIndex
CREATE INDEX "Agendamento_dataHoraInicio_idx" ON "Agendamento"("dataHoraInicio");

-- CreateIndex
CREATE INDEX "Agendamento_profissionalId_idx" ON "Agendamento"("profissionalId");

-- CreateIndex
CREATE INDEX "Agendamento_pacienteId_idx" ON "Agendamento"("pacienteId");

-- CreateIndex
CREATE INDEX "Agendamento_salaId_idx" ON "Agendamento"("salaId");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_data_idx" ON "TransacaoFinanceira"("data");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_tipo_idx" ON "TransacaoFinanceira"("tipo");

-- CreateIndex
CREATE INDEX "TransacaoFinanceira_profissionalId_idx" ON "TransacaoFinanceira"("profissionalId");

-- CreateIndex
CREATE UNIQUE INDEX "Comissao_agendamentoId_key" ON "Comissao"("agendamentoId");

-- CreateIndex
CREATE INDEX "Comissao_profissionalId_idx" ON "Comissao"("profissionalId");

-- CreateIndex
CREATE INDEX "Aluguel_profissionalId_idx" ON "Aluguel"("profissionalId");

-- CreateIndex
CREATE INDEX "Aluguel_mesReferencia_idx" ON "Aluguel"("mesReferencia");

-- AddForeignKey
ALTER TABLE "Profissional" ADD CONSTRAINT "Profissional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disponibilidade" ADD CONSTRAINT "Disponibilidade_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bloqueio" ADD CONSTRAINT "Bloqueio_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoFinanceira" ADD CONSTRAINT "TransacaoFinanceira_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaFinanceira"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoFinanceira" ADD CONSTRAINT "TransacaoFinanceira_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransacaoFinanceira" ADD CONSTRAINT "TransacaoFinanceira_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_agendamentoId_fkey" FOREIGN KEY ("agendamentoId") REFERENCES "Agendamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluguel" ADD CONSTRAINT "Aluguel_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Profissional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
