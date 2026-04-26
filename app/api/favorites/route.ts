import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  offerId: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para salvar favoritos." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Oferta invalida." }, { status: 400 });
  }

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_offerId: {
        userId: session.userId,
        offerId: parsed.data.offerId
      }
    },
    update: {},
    create: {
      userId: session.userId,
      offerId: parsed.data.offerId
    }
  });

  return NextResponse.json({ favorite });
}
