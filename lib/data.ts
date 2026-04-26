import { CabinClass, Program, SubscriptionTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";
import { formatDateShort, formatProgram, getDateWindow } from "@/lib/utils";
import { AdminOverview, DashboardData, SearchResult } from "@/types";

const FREE_SEARCH_LIMIT = Number(process.env.FREE_SEARCH_LIMIT || "8");

type SearchParams = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  flexible: boolean;
  tripType: "ROUND_TRIP" | "ONE_WAY";
  cabinClass: CabinClass;
  passengers: number;
  programs: string[];
};

export async function searchAwardFlights(params: SearchParams): Promise<SearchResult[]> {
  const cacheKey = `search:${JSON.stringify(params)}`;
  const redis = await getRedisClient();

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as SearchResult[];
    }
  }

  const departureWindow = getDateWindow(params.departureDate, params.flexible);
  const returnWindow = params.returnDate ? getDateWindow(params.returnDate, params.flexible) : null;
  const selectedPrograms = params.programs.length
    ? (params.programs.filter((program) => Object.values(Program).includes(program as Program)) as Program[])
    : Object.values(Program);

  const offers = await prisma.awardOffer.findMany({
    where: {
      origin: { contains: params.origin.toUpperCase() },
      destination: { contains: params.destination.toUpperCase() },
      program: { in: selectedPrograms },
      cabinClass: params.cabinClass,
      departureDate: { gte: departureWindow.start, lte: departureWindow.end },
      returnDate:
        params.tripType === "ROUND_TRIP" && returnWindow
          ? { gte: returnWindow.start, lte: returnWindow.end }
          : params.tripType === "ONE_WAY"
            ? null
            : undefined
    },
    include: {
      priceHistory: {
        orderBy: { recordedAt: "asc" }
      }
    },
    orderBy: [{ milesRequired: "asc" }, { taxesAmount: "asc" }]
  });

  const results = offers.map<SearchResult>((offer) => {
    const cashPrice = Number(offer.cashPrice);
    const milesRequired = offer.milesRequired * Math.max(params.passengers, 1);
    const taxesAmount = Number(offer.taxesAmount);
    const valuePerMile = Number(((cashPrice - taxesAmount) / Math.max(milesRequired, 1)).toFixed(3));
    const bestValueScore = Number((valuePerMile * 1000 - taxesAmount / 25).toFixed(2));

    return {
      id: offer.id,
      origin: offer.origin,
      destination: offer.destination,
      departureDate: offer.departureDate.toISOString(),
      returnDate: offer.returnDate ? offer.returnDate.toISOString() : null,
      program: offer.program,
      programLabel: formatProgram(offer.program),
      milesRequired,
      taxesAmount,
      cashPrice,
      valuePerMile,
      bestValueScore,
      affiliateUrl: offer.affiliateUrl,
      history: offer.priceHistory.map((entry) => ({
        date: entry.recordedAt.toISOString(),
        label: formatDateShort(entry.recordedAt.toISOString()),
        miles: entry.milesValue
      }))
    };
  });

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(results), "EX", 60 * 5);
  }

  return results;
}

export function canSearch(tier: SubscriptionTier, monthlySearches: number) {
  if (tier === "PREMIUM") return true;
  return monthlySearches < FREE_SEARCH_LIMIT;
}

export async function incrementUserSearches(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { monthlySearches: { increment: 1 } }
  });
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [user, favorites, alerts, offerHistory] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.favorite.findMany({
      where: { userId },
      include: { offer: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.alert.findMany({
      where: { userId, isActive: true },
      include: { offer: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.priceHistory.findMany({
      orderBy: { recordedAt: "asc" },
      take: 14
    })
  ]);

  const programCounts = new Map<string, number>();
  favorites.forEach((favorite) => {
    const label = formatProgram(favorite.offer.program);
    programCounts.set(label, (programCounts.get(label) || 0) + 1);
  });

  return {
    summary: {
      tier: user.subscriptionTier,
      tierLabel: user.subscriptionTier === "PREMIUM" ? "Premium" : "Free",
      searches: user.monthlySearches,
      favoriteCount: favorites.length,
      alertCount: alerts.length
    },
    favorites: favorites.map((favorite) => ({
      id: favorite.id,
      programLabel: formatProgram(favorite.offer.program),
      origin: favorite.offer.origin,
      destination: favorite.offer.destination,
      milesRequired: favorite.offer.milesRequired
    })),
    alerts: alerts.map((alert) => ({
      id: alert.id,
      programLabel: formatProgram(alert.offer.program),
      origin: alert.offer.origin,
      destination: alert.offer.destination,
      targetMiles: alert.targetMiles
    })),
    history: offerHistory.map((entry) => ({
      label: formatDateShort(entry.recordedAt.toISOString()),
      miles: entry.milesValue
    })),
    programMix: Array.from(programCounts.entries()).map(([label, count]) => ({ label, count }))
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [users, premiumUsers, trackedOffers, activeAlerts, offersByProgram] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { subscriptionTier: "PREMIUM" } }),
    prisma.awardOffer.count(),
    prisma.alert.count({ where: { isActive: true } }),
    prisma.awardOffer.groupBy({
      by: ["program"],
      _count: { _all: true }
    })
  ]);

  return {
    users,
    premiumUsers,
    trackedOffers,
    activeAlerts,
    premiumRevenueEstimate: premiumUsers * Number(process.env.PREMIUM_PRICE_MONTHLY || "59.9"),
    programDistribution: offersByProgram.map((item) => ({
      label: formatProgram(item.program),
      count: item._count._all
    })),
    subscriptionMix: [
      { label: "Free", value: Math.max(users - premiumUsers, 0) },
      { label: "Premium", value: premiumUsers }
    ]
  };
}
