import { CareRequestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { archiveCareRequestForUser, updateCareRequestStatus } from "@/lib/care-data";

const updateSchema = z.object({
  status: z.nativeEnum(CareRequestStatus).optional(),
  archive: z.boolean().optional()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para alterar esta solicitacao." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Status invalido." }, { status: 400 });
  }

  const { id } = await params;

  if (parsed.data.archive) {
    const result = await archiveCareRequestForUser(id, session.userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true });
  }

  if (!parsed.data.status) {
    return NextResponse.json({ error: "Informe uma acao valida." }, { status: 400 });
  }

  const result = await updateCareRequestStatus(id, session.userId, parsed.data.status);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, request: result.request });
}
