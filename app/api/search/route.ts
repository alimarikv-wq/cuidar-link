import { CabinClass } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { canSearch, incrementUserSearches, searchAwardFlights } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user && !canSearch(user.subscriptionTier, user.monthlySearches, user.subscriptionStatus)) {
      return NextResponse.json({ error: "Limite mensal do plano gratuito atingido." }, { status: 403 });
    }

    if (user) {
      await incrementUserSearches(user.id);
    }
  }

  const searchParams = request.nextUrl.searchParams;
  const results = await searchAwardFlights({
    origin: searchParams.get("origin") || "",
    destination: searchParams.get("destination") || "",
    departureDate: searchParams.get("departureDate") || "",
    returnDate: searchParams.get("returnDate") || undefined,
    flexible: searchParams.get("flexible") === "true",
    tripType: searchParams.get("tripType") === "ROUND_TRIP" ? "ROUND_TRIP" : "ONE_WAY",
    cabinClass: ((searchParams.get("cabinClass") || "ECONOMY") as CabinClass) || "ECONOMY",
    passengers: Number(searchParams.get("passengers") || "1"),
    programs: (searchParams.get("programs") || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  });

  return NextResponse.json({ results });
}
