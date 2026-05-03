-- Add patient reviews for completed care requests.
CREATE TABLE "CareReview" (
    "id" TEXT NOT NULL,
    "careRequestId" TEXT NOT NULL,
    "patientProfileId" TEXT,
    "professionalId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareReview_careRequestId_key" ON "CareReview"("careRequestId");
CREATE INDEX "CareReview_professionalId_createdAt_idx" ON "CareReview"("professionalId", "createdAt");
CREATE INDEX "CareReview_patientProfileId_idx" ON "CareReview"("patientProfileId");

ALTER TABLE "CareReview"
ADD CONSTRAINT "CareReview_careRequestId_fkey"
FOREIGN KEY ("careRequestId") REFERENCES "CareRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CareReview"
ADD CONSTRAINT "CareReview_patientProfileId_fkey"
FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CareReview"
ADD CONSTRAINT "CareReview_professionalId_fkey"
FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
