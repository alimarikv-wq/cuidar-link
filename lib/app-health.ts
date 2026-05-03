import { isEmailNotificationsConfigured } from "@/lib/care-notifications";
import { isDocumentStorageConfigured } from "@/lib/document-storage";
import { prisma } from "@/lib/prisma";

export type AppHealthChecks = {
  app: boolean;
  database: boolean;
  googleOAuth: boolean;
  appleOAuth: boolean;
  documentStorage: boolean;
  emailNotifications: boolean;
  demoFallback: boolean;
};

export async function getAppHealthChecks(): Promise<AppHealthChecks> {
  const checks: AppHealthChecks = {
    app: true,
    database: false,
    googleOAuth: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    appleOAuth: Boolean(
      process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY
    ),
    documentStorage: isDocumentStorageConfigured(),
    emailNotifications: isEmailNotificationsConfigured(),
    demoFallback: process.env.CARE_ENABLE_DEMO_FALLBACK !== "false"
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  return checks;
}
