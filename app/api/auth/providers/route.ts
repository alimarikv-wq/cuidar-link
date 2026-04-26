import { NextResponse } from "next/server";
import { isProviderConfigured } from "@/lib/oauth";

export async function GET() {
  return NextResponse.json({
    google: isProviderConfigured("google"),
    apple: isProviderConfigured("apple")
  });
}
