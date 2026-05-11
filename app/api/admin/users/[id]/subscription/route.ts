import { BillingProvider, SubscriptionStatus, SubscriptionTier } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(""));

const subscriptionSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier),
  status: z.nativeEnum(SubscriptionStatus),
  provider: z.nativeEnum(BillingProvider),
  trialEndsAt: dateField,
  renewsAt: dateField
});

function parseAdminDate(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre como admin para alterar assinaturas." }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revise plano, status e provedor da assinatura." }, { status: 400 });
  }

  const { id } = await params;
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionProvider: true,
      subscriptionTrialEndsAt: true,
      subscriptionRenewsAt: true,
      subscriptionCanceledAt: true
    }
  });

  if (!existingUser) {
    return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
  }

  const now = new Date();
  const nextCanceledAt =
    parsed.data.status === SubscriptionStatus.CANCELADO
      ? existingUser.subscriptionCanceledAt || now
      : null;

  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: {
        subscriptionTier: parsed.data.tier,
        subscriptionStatus: parsed.data.status,
        subscriptionProvider: parsed.data.provider,
        subscriptionTrialEndsAt: parseAdminDate(parsed.data.trialEndsAt),
        subscriptionRenewsAt: parseAdminDate(parsed.data.renewsAt),
        subscriptionCanceledAt: nextCanceledAt
      },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        subscriptionProvider: true
      }
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId: session.userId,
        action: "USER_SUBSCRIPTION_UPDATE",
        previousStatus: `${existingUser.subscriptionTier}/${existingUser.subscriptionStatus}/${existingUser.subscriptionProvider}`,
        nextStatus: `${updated.subscriptionTier}/${updated.subscriptionStatus}/${updated.subscriptionProvider}`,
        metadata: {
          targetUserId: updated.id,
          targetUserEmail: updated.email,
          trialEndsAt: parsed.data.trialEndsAt || null,
          renewsAt: parsed.data.renewsAt || null
        }
      }
    });

    return updated;
  });

  return NextResponse.json({ success: true, user: updatedUser });
}
