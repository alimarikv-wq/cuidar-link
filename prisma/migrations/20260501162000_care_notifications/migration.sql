CREATE TABLE "CareNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "careRequestId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "actionUrl" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CareNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareNotification_userId_readAt_createdAt_idx" ON "CareNotification"("userId", "readAt", "createdAt");
CREATE INDEX "CareNotification_careRequestId_idx" ON "CareNotification"("careRequestId");

ALTER TABLE "CareNotification"
  ADD CONSTRAINT "CareNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CareNotification"
  ADD CONSTRAINT "CareNotification_careRequestId_fkey"
  FOREIGN KEY ("careRequestId") REFERENCES "CareRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
