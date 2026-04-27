ALTER TABLE "PatientProfile"
  ADD COLUMN "addressNumber" TEXT,
  ADD COLUMN "addressComplement" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "state" TEXT;

ALTER TABLE "ProfessionalProfile"
  ADD COLUMN "addressNumber" TEXT,
  ADD COLUMN "addressComplement" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "state" TEXT;

ALTER TABLE "CareRequest"
  ADD COLUMN "addressNumber" TEXT,
  ADD COLUMN "addressComplement" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "state" TEXT;
