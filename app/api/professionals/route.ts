import { NextRequest, NextResponse } from "next/server";
import {
  getCareCenter,
  parseAvailability,
  parseCareService,
  parseGenderPreference,
  parseProfessionalType,
  parseSupportLevel,
  searchCareProfessionals
} from "@/lib/care-data";
import { getDemoCareProfessionals, shouldUseDemoFallback } from "@/lib/care-demo-data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const defaultCenter = getCareCenter();
  const requestedLatitude = Number(searchParams.get("latitude") || defaultCenter.latitude);
  const requestedLongitude = Number(searchParams.get("longitude") || defaultCenter.longitude);
  const hasBrowserLocation =
    searchParams.get("locationSource") === "browser" && Number.isFinite(requestedLatitude) && Number.isFinite(requestedLongitude);
  const ageMinParam = searchParams.get("ageMin");
  const ageMaxParam = searchParams.get("ageMax");
  const ageMin = ageMinParam ? Number(ageMinParam) : undefined;
  const ageMax = ageMaxParam ? Number(ageMaxParam) : undefined;
  const center = hasBrowserLocation
    ? {
        ...defaultCenter,
        neighborhood: "Sua localização",
        latitude: requestedLatitude,
        longitude: requestedLongitude
      }
    : defaultCenter;
  const query = {
    service: parseCareService(searchParams.get("service")),
    professionalType: parseProfessionalType(searchParams.get("professionalType")),
    genderPreference: parseGenderPreference(searchParams.get("genderPreference")),
    supportNeed: parseSupportLevel(searchParams.get("supportNeed")),
    availability: parseAvailability(searchParams.get("availability")),
    radiusKm: Number(searchParams.get("radiusKm") || "8"),
    travelRequested: searchParams.get("travelRequested") === "true",
    fixedContractRequested: searchParams.get("fixedContractRequested") === "true",
    ageMin: typeof ageMin === "number" && Number.isFinite(ageMin) ? ageMin : undefined,
    ageMax: typeof ageMax === "number" && Number.isFinite(ageMax) ? ageMax : undefined,
    latitude: center.latitude,
    longitude: center.longitude
  };

  try {
    const results = await searchCareProfessionals(query);

    return NextResponse.json({ results, center, source: "database" });
  } catch (error) {
    console.error(error);

    if (shouldUseDemoFallback()) {
      return NextResponse.json({
        results: getDemoCareProfessionals(query),
        center,
        source: "demo",
        warning: "Banco indisponível. Exibindo profissionais demonstrativos."
      });
    }

    return NextResponse.json({ error: "Não foi possível buscar profissionais agora." }, { status: 503 });
  }
}
