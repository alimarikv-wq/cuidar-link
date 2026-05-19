import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { getCareMarketplaceAccessForUser } from "@/lib/care-marketplace-access";
import { createProfessionalInquiryForUser } from "@/lib/care-data";

const inquirySchema = z.object({
  professionalId: z.string().min(1),
  requesterName: z.string().trim().min(2).max(120),
  requesterEmail: z.string().trim().email().optional().or(z.literal("")),
  requesterPhone: z.string().trim().max(30).optional().or(z.literal("")),
  fixedContractRequested: z.boolean().optional(),
  body: z.string().trim().min(1).max(1000)
});

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const body = await request.json();
  const parsed = inquirySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revise os dados da mensagem." }, { status: 400 });
  }

  if (session) {
    const access = await getCareMarketplaceAccessForUser(session.userId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }

  const result = await createProfessionalInquiryForUser(parsed.data, session?.userId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, inquiry: result.inquiry });
}
