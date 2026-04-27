import { CareRequestStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { updateCareRequestStatus } from "@/lib/care-data";

const updateSchema = z.object({
  status: z.nativeEnum(CareRequestStatus)
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
  const result = await updateCareRequestStatus(id, session.userId, parsed.data.status);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, request: result.request });
}
