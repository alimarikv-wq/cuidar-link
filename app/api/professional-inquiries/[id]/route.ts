import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { archiveProfessionalInquiryForUser, restoreProfessionalInquiryForUser } from "@/lib/care-data";

const updateSchema = z.object({
  archive: z.boolean()
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para alterar esta conversa." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe uma ação válida." }, { status: 400 });
  }

  const { id } = await params;
  const result = parsed.data.archive
    ? await archiveProfessionalInquiryForUser(id, session.userId)
    : await restoreProfessionalInquiryForUser(id, session.userId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}
