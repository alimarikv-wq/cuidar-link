CREATE TYPE "ProfessionalInquiryStatus" AS ENUM ('ABERTA', 'RESPONDIDA', 'ARQUIVADA');

CREATE TABLE "ProfessionalInquiry" (
  "id" TEXT NOT NULL,
  "patientProfileId" TEXT,
  "professionalId" TEXT NOT NULL,
  "requesterName" TEXT NOT NULL,
  "requesterEmail" TEXT,
  "requesterPhone" TEXT,
  "status" "ProfessionalInquiryStatus" NOT NULL DEFAULT 'ABERTA',
  "patientArchivedAt" TIMESTAMP(3),
  "professionalArchivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProfessionalInquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProfessionalInquiryMessage" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "senderId" TEXT,
  "senderName" TEXT NOT NULL,
  "senderEmail" TEXT,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProfessionalInquiryMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfessionalInquiry_professionalId_status_updatedAt_idx" ON "ProfessionalInquiry"("professionalId", "status", "updatedAt");
CREATE INDEX "ProfessionalInquiry_patientProfileId_status_updatedAt_idx" ON "ProfessionalInquiry"("patientProfileId", "status", "updatedAt");
CREATE INDEX "ProfessionalInquiry_requesterEmail_updatedAt_idx" ON "ProfessionalInquiry"("requesterEmail", "updatedAt");
CREATE INDEX "ProfessionalInquiryMessage_inquiryId_createdAt_idx" ON "ProfessionalInquiryMessage"("inquiryId", "createdAt");
CREATE INDEX "ProfessionalInquiryMessage_senderId_idx" ON "ProfessionalInquiryMessage"("senderId");
CREATE INDEX "ProfessionalInquiryMessage_readAt_idx" ON "ProfessionalInquiryMessage"("readAt");

ALTER TABLE "ProfessionalInquiry"
ADD CONSTRAINT "ProfessionalInquiry_patientProfileId_fkey"
FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProfessionalInquiry"
ADD CONSTRAINT "ProfessionalInquiry_professionalId_fkey"
FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfessionalInquiryMessage"
ADD CONSTRAINT "ProfessionalInquiryMessage_inquiryId_fkey"
FOREIGN KEY ("inquiryId") REFERENCES "ProfessionalInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfessionalInquiryMessage"
ADD CONSTRAINT "ProfessionalInquiryMessage_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
