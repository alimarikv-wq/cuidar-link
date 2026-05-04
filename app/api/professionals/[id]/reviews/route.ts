import { NextResponse } from "next/server";
import { getProfessionalReviews } from "@/lib/care-data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviews = await getProfessionalReviews(id);

  if (!reviews) {
    return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ reviews });
}
