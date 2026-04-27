import { VerificationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { reviewProfessionalDocument } from "@/lib/care-data";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  status: z.nativeEnum(VerificationStatus),
  reviewNote: z.string().max(600).optional().or(z.literal(""))
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para revisar documentos." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { role: true } });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Revise os dados da verificacao." }, { status: 400 });
  }

  const { id } = await params;
  const document = await reviewProfessionalDocument(id, parsed.data.status, parsed.data.reviewNote || undefined);
  return NextResponse.json({ success: true, document });
}
