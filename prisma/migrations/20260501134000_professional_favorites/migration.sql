CREATE TABLE "ProfessionalFavorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "professionalId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProfessionalFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalFavorite_userId_professionalId_key" ON "ProfessionalFavorite"("userId", "professionalId");
CREATE INDEX "ProfessionalFavorite_professionalId_idx" ON "ProfessionalFavorite"("professionalId");

ALTER TABLE "ProfessionalFavorite"
  ADD CONSTRAINT "ProfessionalFavorite_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProfessionalFavorite"
  ADD CONSTRAINT "ProfessionalFavorite_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
