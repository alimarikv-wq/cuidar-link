import { DocumentType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { createProfessionalDocumentForUser } from "@/lib/care-data";

const createSchema = z.object({
  type: z.nativeEnum(DocumentType),
  label: z.string().min(2).max(120).optional().or(z.literal("")),
  documentNumber: z.string().max(80).optional().or(z.literal("")),
  fileUrl: z.string().max(3_000_000).optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal(""))
});

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para enviar documentos." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revise os dados do documento." }, { status: 400 });
  }

  const result = await createProfessionalDocumentForUser(session.userId, {
    ...parsed.data,
    label: parsed.data.label || undefined,
    documentNumber: parsed.data.documentNumber || undefined,
    fileUrl: parsed.data.fileUrl || undefined,
    expiresAt: parsed.data.expiresAt || undefined
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, document: result.document });
}
