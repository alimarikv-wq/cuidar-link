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
  const center = getCareCenter();
  const query = {
    service: parseCareService(searchParams.get("service")),
    professionalType: parseProfessionalType(searchParams.get("professionalType")),
    genderPreference: parseGenderPreference(searchParams.get("genderPreference")),
    supportNeed: parseSupportLevel(searchParams.get("supportNeed")),
    availability: parseAvailability(searchParams.get("availability")),
    radiusKm: Number(searchParams.get("radiusKm") || "8"),
    latitude: Number(searchParams.get("latitude") || center.latitude),
    longitude: Number(searchParams.get("longitude") || center.longitude)
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
        warning: "Banco indisponivel. Exibindo profissionais demonstrativos."
      });
    }

    return NextResponse.json({ error: "Nao foi possivel buscar profissionais agora." }, { status: 503 });
  }
}
