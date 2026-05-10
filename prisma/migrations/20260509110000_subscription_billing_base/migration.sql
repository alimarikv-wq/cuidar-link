-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ATIVO', 'TRIAL', 'CANCELADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('MANUAL', 'STRIPE', 'MERCADO_PAGO');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ATIVO',
ADD COLUMN "subscriptionProvider" "BillingProvider" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "subscriptionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "subscriptionTrialEndsAt" TIMESTAMP(3),
ADD COLUMN "subscriptionRenewsAt" TIMESTAMP(3),
ADD COLUMN "subscriptionCanceledAt" TIMESTAMP(3),
ADD COLUMN "billingCustomerId" TEXT,
ADD COLUMN "billingSubscriptionId" TEXT;

-- CreateIndex
CREATE INDEX "User_subscriptionTier_subscriptionStatus_idx" ON "User"("subscriptionTier", "subscriptionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "User_billingCustomerId_key" ON "User"("billingCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_billingSubscriptionId_key" ON "User"("billingSubscriptionId");
