import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAvailableCareRequestSlots } from "@/lib/care-data";

const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationHours: z.coerce.number().min(0.5).max(24).default(2)
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = availabilitySchema.safeParse({
    date: request.nextUrl.searchParams.get("date"),
    durationHours: request.nextUrl.searchParams.get("durationHours") || "2"
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Informe data e duracao validas." }, { status: 400 });
  }

  const slots = await getAvailableCareRequestSlots(id, parsed.data.date, parsed.data.durationHours);

  return NextResponse.json({ slots });
}
