ALTER TABLE "CareRequest"
ADD COLUMN "scheduledEndAt" TIMESTAMP(3),
ADD COLUMN "completionAvailableAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "completedById" TEXT;

UPDATE "CareRequest"
SET
  "scheduledEndAt" = "scheduledFor" + ("durationHours"::double precision * interval '1 hour'),
  "completionAvailableAt" = "scheduledFor" + ("durationHours"::double precision * interval '1 hour') + interval '1 minute',
  "completedAt" = CASE WHEN "status" = 'CONCLUIDO' THEN "updatedAt" ELSE NULL END
WHERE "scheduledFor" IS NOT NULL;

CREATE TABLE "CareMessage" (
  "id" TEXT NOT NULL,
  "careRequestId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CareMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareRequest_completionAvailableAt_idx" ON "CareRequest"("completionAvailableAt");
CREATE INDEX "CareMessage_careRequestId_createdAt_idx" ON "CareMessage"("careRequestId", "createdAt");
CREATE INDEX "CareMessage_senderId_idx" ON "CareMessage"("senderId");
CREATE INDEX "CareMessage_readAt_idx" ON "CareMessage"("readAt");

ALTER TABLE "CareMessage"
ADD CONSTRAINT "CareMessage_careRequestId_fkey"
FOREIGN KEY ("careRequestId") REFERENCES "CareRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CareMessage"
ADD CONSTRAINT "CareMessage_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
