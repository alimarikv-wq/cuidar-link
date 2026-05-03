-- AlterTable
ALTER TABLE "CareRequest" ADD COLUMN "patientDeletedAt" TIMESTAMP(3);
ALTER TABLE "CareRequest" ADD COLUMN "professionalDeletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CareRequest_professionalId_professionalDeletedAt_createdAt_idx" ON "CareRequest"("professionalId", "professionalDeletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "CareRequest_patientProfileId_patientDeletedAt_createdAt_idx" ON "CareRequest"("patientProfileId", "patientDeletedAt", "createdAt");
