import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  offerId: z.string().min(1),
  targetMiles: z.number().int().positive()
});

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para criar alertas." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const alert = await prisma.alert.upsert({
    where: {
      userId_offerId: {
        userId: session.userId,
        offerId: parsed.data.offerId
      }
    },
    update: {
      targetMiles: parsed.data.targetMiles,
      isActive: true
    },
    create: {
      userId: session.userId,
      offerId: parsed.data.offerId,
      targetMiles: parsed.data.targetMiles
    }
  });

  return NextResponse.json({ alert });
}
