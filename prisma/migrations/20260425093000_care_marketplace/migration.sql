-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PATIENT', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMININO', 'MASCULINO', 'OUTRO');

-- CreateEnum
CREATE TYPE "GenderPreference" AS ENUM ('FEMININO', 'MASCULINO', 'QUALQUER');

-- CreateEnum
CREATE TYPE "ProfessionalType" AS ENUM ('CUIDADOR', 'TECNICO_ENFERMAGEM', 'FISIOTERAPEUTA');

-- CreateEnum
CREATE TYPE "CareService" AS ENUM ('BANHO', 'TRANSFERENCIA', 'MEDICACAO', 'CURATIVOS', 'FISIOTERAPIA', 'COMPANHIA', 'REFEICAO', 'SINAIS_VITAIS', 'AVALIACAO', 'FORTALECIMENTO');

-- CreateEnum
CREATE TYPE "TransferSupportLevel" AS ENUM ('MODERADO', 'ALTO', 'DUPLA');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RG', 'CPF', 'COREN', 'CREFITO', 'CERTIFICADO', 'REFERENCIA');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDENTE', 'VERIFICADO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "CareRequestStatus" AS ENUM ('RASCUNHO', 'ENVIADO', 'ACEITO', 'AGENDADO', 'CONCLUIDO', 'CANCELADO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'PATIENT';

-- CreateTable
CREATE TABLE "PatientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Porto Alegre',
    "neighborhood" TEXT NOT NULL,
    "addressLine" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "approximateWeightKg" INTEGER,
    "mobilityNotes" TEXT,
    "preferredGender" "GenderPreference" NOT NULL DEFAULT 'FEMININO',
    "transferNeed" "TransferSupportLevel" NOT NULL DEFAULT 'ALTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "professionalType" "ProfessionalType" NOT NULL,
    "gender" "Gender" NOT NULL,
    "age" INTEGER NOT NULL,
    "phone" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Porto Alegre',
    "neighborhood" TEXT NOT NULL,
    "addressLine" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "serviceRadiusKm" INTEGER NOT NULL DEFAULT 8,
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "sessionRate" DECIMAL(10,2),
    "photoUrl" TEXT,
    "bio" TEXT NOT NULL,
    "mobilitySupport" TEXT NOT NULL,
    "supportLevel" "TransferSupportLevel" NOT NULL,
    "services" "CareService"[] NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "responseMinutes" INTEGER NOT NULL DEFAULT 15,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalDocument" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDENTE',
    "label" TEXT NOT NULL,
    "documentNumber" TEXT,
    "fileUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfessionalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareRequest" (
    "id" TEXT NOT NULL,
    "patientProfileId" TEXT,
    "professionalId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT,
    "requesterPhone" TEXT,
    "service" "CareService" NOT NULL,
    "supportNeed" "TransferSupportLevel" NOT NULL,
    "preferredGender" "GenderPreference" NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "durationHours" DECIMAL(4,2) NOT NULL DEFAULT 2,
    "addressLine" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Porto Alegre',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "notes" TEXT,
    "status" "CareRequestStatus" NOT NULL DEFAULT 'ENVIADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CareRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_userId_key" ON "PatientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_professionalType_idx" ON "ProfessionalProfile"("professionalType");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_gender_idx" ON "ProfessionalProfile"("gender");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_neighborhood_idx" ON "ProfessionalProfile"("neighborhood");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_isActive_idx" ON "ProfessionalProfile"("isActive");

-- CreateIndex
CREATE INDEX "ProfessionalDocument_professionalId_idx" ON "ProfessionalDocument"("professionalId");

-- CreateIndex
CREATE INDEX "ProfessionalDocument_status_idx" ON "ProfessionalDocument"("status");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_professionalId_weekday_idx" ON "AvailabilitySlot"("professionalId", "weekday");

-- CreateIndex
CREATE INDEX "CareRequest_professionalId_status_idx" ON "CareRequest"("professionalId", "status");

-- CreateIndex
CREATE INDEX "CareRequest_patientProfileId_idx" ON "CareRequest"("patientProfileId");

-- CreateIndex
CREATE INDEX "CareRequest_scheduledFor_idx" ON "CareRequest"("scheduledFor");

-- AddForeignKey
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalDocument" ADD CONSTRAINT "ProfessionalDocument_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequest" ADD CONSTRAINT "CareRequest_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareRequest" ADD CONSTRAINT "CareRequest_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
