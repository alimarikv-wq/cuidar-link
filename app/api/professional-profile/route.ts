import { CareService, TransferSupportLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { updateProfessionalProfileForUser } from "@/lib/care-data";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const optionalText = (schema: z.ZodTypeAny = z.string()) =>
  z.preprocess((value) => (value === null ? "" : value), schema.optional().or(z.literal("")));

function profileValidationMessage(error: z.ZodError) {
  const issue = error.issues[0];
  const field = issue?.path.join(".");
  const fieldLabels: Record<string, string> = {
    phone: "telefone",
    whatsappPhone: "WhatsApp publico",
    neighborhood: "bairro",
    addressLine: "endereco",
    addressNumber: "numero",
    postalCode: "CEP",
    city: "cidade",
    state: "UF",
    serviceRadiusKm: "raio de atendimento",
    hourlyRate: "valor por hora",
    sessionRate: "valor por sessao",
    bio: "experiencia",
    mobilitySupport: "apoio em mobilidade",
    supportLevel: "capacidade",
    travelNotes: "observacoes de viagem",
    services: "servicos",
    availability: "agenda semanal"
  };

  if (!issue) return "Revise os dados do perfil.";
  if (issue.message && issue.message !== "Invalid input") return issue.message;

  const label = field ? fieldLabels[field] || fieldLabels[field.split(".")[0]] : "";
  return label ? `Revise o campo ${label}.` : "Revise os dados do perfil.";
}

function isValidPublicWhatsApp(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  return !digits || digits.length === 10 || digits.length === 11 || (digits.startsWith("55") && (digits.length === 12 || digits.length === 13));
}

const updateSchema = z.object({
  phone: optionalText(),
  whatsappPhone: optionalText(
    z
      .string()
      .max(20, "Informe um WhatsApp valido ou deixe em branco.")
      .refine(isValidPublicWhatsApp, "Informe um WhatsApp com DDD, ou deixe em branco.")
  ),
  neighborhood: z.string().min(2),
  addressLine: optionalText(),
  addressNumber: optionalText(),
  addressComplement: optionalText(),
  postalCode: optionalText(),
  city: optionalText(z.string().min(2, "Informe a cidade ou deixe em branco.")),
  state: optionalText(z.string().min(2, "Informe a UF com 2 letras.").max(2, "Informe a UF com 2 letras.")),
  serviceRadiusKm: z.coerce.number().int().min(1, "Informe um raio de atendimento entre 1 e 50 km.").max(50, "Informe um raio de atendimento entre 1 e 50 km."),
  hourlyRate: z.coerce.number().min(1, "Informe o valor por hora.").max(1000, "O valor por hora esta acima do limite aceito."),
  sessionRate: z.coerce.number().min(1, "Informe o valor por sessao ou deixe em branco.").max(5000, "O valor por sessao esta acima do limite aceito.").nullable().optional(),
  bio: z.string().min(3, "Informe sua experiencia profissional.").max(600, "A experiencia deve ter no maximo 600 caracteres."),
  mobilitySupport: z.string().min(10, "Descreva como voce apoia mobilidade e transferencia.").max(600, "O apoio em mobilidade deve ter no maximo 600 caracteres."),
  supportLevel: z.nativeEnum(TransferSupportLevel),
  acceptsTravel: z.boolean().default(false),
  hasPassport: z.boolean().default(false),
  hasUsVisa: z.boolean().default(false),
  travelNotes: optionalText(z.string().max(500, "As observacoes de viagem devem ter no maximo 500 caracteres.")),
  services: z.array(z.nativeEnum(CareService)).min(1, "Selecione pelo menos um servico."),
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
    return NextResponse.json({ error: profileValidationMessage(parsed.error) }, { status: 400 });
  }

  const invalidSlot = parsed.data.availability.find((slot) => slot.startTime >= slot.endTime);
  if (invalidSlot) {
    return NextResponse.json({ error: "O horario inicial precisa ser menor que o horario final." }, { status: 400 });
  }

  const result = await updateProfessionalProfileForUser(session.userId, {
    ...parsed.data,
    phone: parsed.data.phone || undefined,
    whatsappPhone: parsed.data.whatsappPhone || undefined,
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
