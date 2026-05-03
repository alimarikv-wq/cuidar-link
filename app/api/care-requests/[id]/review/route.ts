import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { createCareRequestReview } from "@/lib/care-data";

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(600).optional().or(z.literal(""))
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para avaliar este atendimento." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe uma nota de 1 a 5." }, { status: 400 });
  }

  const { id } = await params;
  const result = await createCareRequestReview(id, session.userId, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, review: result.review });
}
