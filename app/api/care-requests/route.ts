import { CareService, GenderPreference, TransferSupportLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { createCareRequest, getCareRequestsForUser } from "@/lib/care-data";
import { shouldUseDemoFallback } from "@/lib/care-demo-data";

const createSchema = z.object({
  professionalId: z.string().min(1),
  requesterName: z.string().min(2),
  requesterEmail: z.string().email(),
  requesterPhone: z.string().min(8),
  service: z.nativeEnum(CareService),
  supportNeed: z.nativeEnum(TransferSupportLevel),
  preferredGender: z.nativeEnum(GenderPreference),
  scheduledFor: z.string().min(16),
  durationHours: z.coerce.number().min(0.5).max(24).optional(),
  addressLine: z.string().min(3),
  addressNumber: z.string().min(1),
  addressComplement: z.string().optional().or(z.literal("")),
  postalCode: z.string().min(8),
  neighborhood: z.string().min(2),
  city: z.string().min(2).optional(),
  state: z.string().min(2).max(2).optional().or(z.literal("")),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  notes: z.string().max(1000).optional().or(z.literal("")),
  travelRequested: z.boolean().optional(),
  travelDestination: z.string().max(160).optional().or(z.literal("")),
  isInternationalTravel: z.boolean().optional(),
  needsUsVisa: z.boolean().optional(),
  travelNotes: z.string().max(500).optional().or(z.literal("")),
  rulesAccepted: z.boolean().refine(Boolean)
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para ver seus atendimentos." }, { status: 401 });
  }

  const requests = await getCareRequestsForUser(session.userId);
  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body || typeof body !== "object" || (body as { rulesAccepted?: unknown }).rulesAccepted !== true) {
    return NextResponse.json({ error: "Leia e aceite as regras do atendimento para enviar o pedido." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Revise os dados do atendimento." }, { status: 400 });
  }

  const session = await getSessionFromRequest(request);

  try {
    const result = await createCareRequest(
      {
        ...parsed.data,
        requesterEmail: parsed.data.requesterEmail || undefined,
        requesterPhone: parsed.data.requesterPhone || undefined,
        addressNumber: parsed.data.addressNumber || undefined,
        addressComplement: parsed.data.addressComplement || undefined,
        postalCode: parsed.data.postalCode || undefined,
        state: parsed.data.state || undefined,
        scheduledFor: parsed.data.scheduledFor || undefined,
        notes: parsed.data.notes || undefined,
        travelDestination: parsed.data.travelDestination || undefined,
        travelNotes: parsed.data.travelNotes || undefined
      },
      session?.userId
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const requestRecord = result.request;

    return NextResponse.json({
      success: true,
      request: {
        id: requestRecord.id,
        status: requestRecord.status,
        professionalName: requestRecord.professional.user.name
      }
    });
  } catch (error) {
    console.error(error);

    if (shouldUseDemoFallback()) {
      return NextResponse.json({
        success: true,
        demo: true,
        request: {
          id: `demo-request-${crypto.randomUUID()}`,
          status: "ENVIADO",
          professionalName: "Profissional selecionado"
        },
        warning: "Banco indisponivel. Solicitacao simulada em modo demonstracao."
      });
    }

    return NextResponse.json({ error: "Nao foi possivel enviar a solicitacao." }, { status: 500 });
  }
}
