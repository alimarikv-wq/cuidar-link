ALTER TABLE "ProfessionalProfile"
  ADD COLUMN "acceptsTravel" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasPassport" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hasUsVisa" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "travelNotes" TEXT;

ALTER TABLE "CareRequest"
  ADD COLUMN "travelRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "travelDestination" TEXT,
  ADD COLUMN "isInternationalTravel" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "needsUsVisa" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "travelNotes" TEXT;

CREATE INDEX "ProfessionalProfile_acceptsTravel_idx" ON "ProfessionalProfile"("acceptsTravel");
