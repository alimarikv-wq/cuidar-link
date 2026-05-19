import { GenderPreference, TransferSupportLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { getPatientProfileForUser, updatePatientProfileForUser } from "@/lib/care-data";

const optionalText = (schema: z.ZodTypeAny = z.string()) =>
  z.preprocess((value) => (value === null ? "" : value), schema.optional().or(z.literal("")));

const phoneSchema = z
  .string()
  .trim()
  .max(30, "Telefone muito longo.")
  .refine((value) => value.replace(/\D/g, "").length >= 10, "Informe telefone com DDD.");
const cepSchema = z
  .string()
  .trim()
  .max(12, "CEP muito longo.")
  .refine((value) => value.replace(/\D/g, "").length === 8, "Informe um CEP válido.");

const updateSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120, "Nome muito longo."),
  phone: phoneSchema,
  neighborhood: z.string().trim().min(2, "Informe o bairro."),
  addressLine: z.string().trim().min(2, "Informe o endereço.").max(160, "Endereço muito longo."),
  addressNumber: z.string().trim().min(1, "Informe o número.").max(20, "Número muito longo."),
  addressComplement: optionalText(z.string().max(80, "Complemento muito longo.")),
  postalCode: cepSchema,
  city: z.string().trim().min(2, "Informe a cidade.").max(80, "Cidade muito longa."),
  state: z.string().trim().min(2, "Informe a UF com 2 letras.").max(2, "Informe a UF com 2 letras."),
  approximateWeightKg: z.coerce.number().int().min(1).max(400).nullable().optional(),
  preferredGender: z.nativeEnum(GenderPreference),
  transferNeed: z.nativeEnum(TransferSupportLevel),
  mobilityNotes: optionalText(z.string().max(600, "As observações devem ter no máximo 600 caracteres."))
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false, profile: null });
  }

  const profile = await getPatientProfileForUser(session.userId);
  return NextResponse.json({ authenticated: true, profile });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para editar seu perfil de paciente." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revise os dados do paciente." }, { status: 400 });
  }

  const result = await updatePatientProfileForUser(session.userId, {
    ...parsed.data,
    phone: parsed.data.phone || undefined,
    addressLine: parsed.data.addressLine || undefined,
    addressNumber: parsed.data.addressNumber || undefined,
    addressComplement: parsed.data.addressComplement || undefined,
    postalCode: parsed.data.postalCode || undefined,
    city: parsed.data.city || undefined,
    state: parsed.data.state || undefined,
    approximateWeightKg: parsed.data.approximateWeightKg ?? null,
    mobilityNotes: parsed.data.mobilityNotes || null
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true });
}
