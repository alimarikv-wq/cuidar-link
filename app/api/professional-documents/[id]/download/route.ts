import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { createPrivateDocumentSignedUrl } from "@/lib/document-storage";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para abrir documentos." }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { professionalProfile: true }
  });
  const document = await prisma.professionalDocument.findUnique({ where: { id } });

  if (!user || !document) {
    return NextResponse.json({ error: "Documento nao encontrado." }, { status: 404 });
  }

  const canOpen = user.role === "ADMIN" || user.professionalProfile?.id === document.professionalId;
  if (!canOpen) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (document.storagePath) {
    const signed = await createPrivateDocumentSignedUrl(document.storagePath);
    if (!signed.ok) {
      return NextResponse.json({ error: signed.error }, { status: 503 });
    }

    return NextResponse.redirect(signed.signedUrl);
  }

  if (document.fileUrl) {
    return NextResponse.redirect(document.fileUrl);
  }

  return NextResponse.json({ error: "Arquivo nao encontrado." }, { status: 404 });
}
