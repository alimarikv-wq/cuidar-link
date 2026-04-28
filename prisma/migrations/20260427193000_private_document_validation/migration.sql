CREATE TYPE "ProfessionalVerificationStatus" AS ENUM ('PENDENTE', 'EM_ANALISE', 'APROVADO', 'REPROVADO');

ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'CNH';
ALTER TYPE "DocumentType" ADD VALUE IF NOT EXISTS 'COMPROVANTE_RESIDENCIA';

ALTER TABLE "ProfessionalProfile"
  ADD COLUMN "cpf" TEXT,
  ADD COLUMN "professionalRegistrationNumber" TEXT,
  ADD COLUMN "professionalRegistrationUf" TEXT,
  ADD COLUMN "verificationStatus" "ProfessionalVerificationStatus" NOT NULL DEFAULT 'PENDENTE',
  ADD COLUMN "verificationNote" TEXT,
  ADD COLUMN "verificationReviewedAt" TIMESTAMP(3);

ALTER TABLE "ProfessionalDocument"
  ADD COLUMN "storagePath" TEXT,
  ADD COLUMN "fileName" TEXT,
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "fileSize" INTEGER,
  ADD COLUMN "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "consentAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "externalCheckStatus" TEXT,
  ADD COLUMN "externalCheckSource" TEXT,
  ADD COLUMN "externalCheckMessage" TEXT,
  ADD COLUMN "externalCheckCheckedAt" TIMESTAMP(3);

CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "targetProfessionalId" TEXT,
  "documentId" TEXT,
  "action" TEXT NOT NULL,
  "previousStatus" TEXT,
  "nextStatus" TEXT,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");
CREATE INDEX "AdminAuditLog_targetProfessionalId_idx" ON "AdminAuditLog"("targetProfessionalId");
CREATE INDEX "AdminAuditLog_documentId_idx" ON "AdminAuditLog"("documentId");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
