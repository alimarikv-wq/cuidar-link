import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCareAdminOverview } from "@/lib/care-data";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const overview = await getCareAdminOverview();
  return NextResponse.json({ overview });
}
