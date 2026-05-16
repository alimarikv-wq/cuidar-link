import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { getCareMarketplaceAccessForUser } from "@/lib/care-marketplace-access";
import { prisma } from "@/lib/prisma";

const favoriteSchema = z.object({
  professionalId: z.string().min(1)
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ favoriteIds: [] }, { status: 200 });
  }

  const favorites = await prisma.professionalFavorite.findMany({
    where: { userId: session.userId },
    select: { professionalId: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ favoriteIds: favorites.map((favorite) => favorite.professionalId) });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para salvar favoritos." }, { status: 401 });
  }

  const access = await getCareMarketplaceAccessForUser(session.userId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const parsed = favoriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Profissional invalido." }, { status: 400 });
  }

  const professional = await prisma.professionalProfile.findUnique({
    where: { id: parsed.data.professionalId },
    select: { id: true }
  });

  if (!professional) {
    return NextResponse.json({ error: "Profissional nao encontrado." }, { status: 404 });
  }

  await prisma.professionalFavorite.upsert({
    where: {
      userId_professionalId: {
        userId: session.userId,
        professionalId: parsed.data.professionalId
      }
    },
    update: {},
    create: {
      userId: session.userId,
      professionalId: parsed.data.professionalId
    }
  });

  return NextResponse.json({ success: true, favorited: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para remover favoritos." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = favoriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Profissional invalido." }, { status: 400 });
  }

  await prisma.professionalFavorite.deleteMany({
    where: {
      userId: session.userId,
      professionalId: parsed.data.professionalId
    }
  });

  return NextResponse.json({ success: true, favorited: false });
}
