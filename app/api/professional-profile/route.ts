import { CareService, TransferSupportLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { updateProfessionalProfileForUser } from "@/lib/care-data";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const updateSchema = z.object({
  phone: z.string().optional().or(z.literal("")),
  neighborhood: z.string().min(2),
  addressLine: z.string().optional().or(z.literal("")),
  addressNumber: z.string().optional().or(z.literal("")),
  addressComplement: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  city: z.string().min(2).optional().or(z.literal("")),
  state: z.string().min(2).max(2).optional().or(z.literal("")),
  serviceRadiusKm: z.coerce.number().int().min(1).max(50),
  hourlyRate: z.coerce.number().min(1).max(1000),
  sessionRate: z.coerce.number().min(1).max(5000).nullable().optional(),
  bio: z.string().min(10).max(600),
  mobilitySupport: z.string().min(10).max(600),
  supportLevel: z.nativeEnum(TransferSupportLevel),
  acceptsTravel: z.boolean().default(false),
  hasPassport: z.boolean().default(false),
  hasUsVisa: z.boolean().default(false),
  travelNotes: z.string().max(500).optional().or(z.literal("")),
  services: z.array(z.nativeEnum(CareService)).min(1),
  availability: z
    .array(
      z.object({
        weekday: z.coerce.number().int().min(0).max(6),
        startTime: timeSchema,
        endTime: timeSchema
      })
    )
    .max(14)
});

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para editar seu perfil profissional." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revise os dados do perfil." }, { status: 400 });
  }

  const invalidSlot = parsed.data.availability.find((slot) => slot.startTime >= slot.endTime);
  if (invalidSlot) {
    return NextResponse.json({ error: "O horario inicial precisa ser menor que o horario final." }, { status: 400 });
  }

  const result = await updateProfessionalProfileForUser(session.userId, {
    ...parsed.data,
    phone: parsed.data.phone || undefined,
    addressLine: parsed.data.addressLine || undefined,
    addressNumber: parsed.data.addressNumber || undefined,
    addressComplement: parsed.data.addressComplement || undefined,
    postalCode: parsed.data.postalCode || undefined,
    city: parsed.data.city || undefined,
    state: parsed.data.state || undefined,
    sessionRate: parsed.data.sessionRate ?? null,
    travelNotes: parsed.data.travelNotes || undefined
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}
