-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "CareRequest" ADD COLUMN "patientArchivedAt" TIMESTAMP(3);
ALTER TABLE "CareRequest" ADD COLUMN "professionalArchivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CareRequest_professionalId_professionalArchivedAt_createdAt_idx" ON "CareRequest"("professionalId", "professionalArchivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "CareRequest_patientProfileId_patientArchivedAt_createdAt_idx" ON "CareRequest"("patientProfileId", "patientArchivedAt", "createdAt");
