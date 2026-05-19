ALTER TABLE "ProfessionalProfile" ADD COLUMN "acceptsFixedContract" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CareRequest" ADD COLUMN "fixedContractRequested" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ProfessionalInquiry" ADD COLUMN "fixedContractRequested" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ProfessionalProfile_acceptsFixedContract_idx" ON "ProfessionalProfile"("acceptsFixedContract");
