import { NextResponse } from "next/server";
import { getAppHealthChecks } from "@/lib/app-health";

export async function GET() {
  const checks = await getAppHealthChecks();
  return NextResponse.json(checks, { status: checks.database ? 200 : 503 });
}
