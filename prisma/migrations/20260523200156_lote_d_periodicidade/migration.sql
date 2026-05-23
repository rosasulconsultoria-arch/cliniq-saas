-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('MENSAL', 'ANUAL');

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "periodicidade" "Periodicidade" NOT NULL DEFAULT 'MENSAL';
