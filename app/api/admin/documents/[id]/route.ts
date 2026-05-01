import { DocumentType, VerificationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { reviewProfessionalDocument, updateProfessionalDocumentType } from "@/lib/care-data";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  status: z.nativeEnum(VerificationStatus).optional(),
  type: z.nativeEnum(DocumentType).optional(),
  reviewNote: z.string().max(600).optional().or(z.literal(""))
}).refine((data) => Boolean(data.status || data.type), {
  message: "Informe uma acao para o documento."
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
  try {
    const document = parsed.data.type
      ? await updateProfessionalDocumentType(session.userId, id, parsed.data.type, parsed.data.reviewNote || undefined)
      : await reviewProfessionalDocument(session.userId, id, parsed.data.status!, parsed.data.reviewNote || undefined);

    if (parsed.data.type && parsed.data.status) {
      const reviewedDocument = await reviewProfessionalDocument(session.userId, id, parsed.data.status, parsed.data.reviewNote || undefined);
      return NextResponse.json({ success: true, document: reviewedDocument });
    }

    return NextResponse.json({ success: true, document });
  } catch {
    return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });
  }
}
