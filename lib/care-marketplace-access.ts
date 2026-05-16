import { prisma } from "@/lib/prisma";
import { canUseCareMarketplace, inactiveSubscriptionCareAccessMessage } from "@/lib/subscription-plans";

export async function getCareMarketplaceAccessForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      accountType: true,
      subscriptionStatus: true
    }
  });

  if (!user) {
    return { ok: false as const, status: 401, error: "Sessao invalida. Entre novamente para continuar." };
  }

  if (!canUseCareMarketplace(user)) {
    return { ok: false as const, status: 403, error: inactiveSubscriptionCareAccessMessage };
  }

  return { ok: true as const, user };
}
