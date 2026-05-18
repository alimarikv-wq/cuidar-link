import { GenderPreference, TransferSupportLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { updatePatientProfileForUser } from "@/lib/care-data";

const optionalText = (schema: z.ZodTypeAny = z.string()) =>
  z.preprocess((value) => (value === null ? "" : value), schema.optional().or(z.literal("")));

const updateSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120, "Nome muito longo."),
  phone: optionalText(z.string().max(30, "Telefone muito longo.")),
  neighborhood: z.string().trim().min(2, "Informe o bairro."),
  addressLine: optionalText(z.string().max(160, "Endereco muito longo.")),
  addressNumber: optionalText(z.string().max(20, "Numero muito longo.")),
  addressComplement: optionalText(z.string().max(80, "Complemento muito longo.")),
  postalCode: optionalText(z.string().max(12, "CEP muito longo.")),
  city: optionalText(z.string().min(2, "Informe a cidade ou deixe em branco.").max(80, "Cidade muito longa.")),
  state: optionalText(z.string().min(2, "Informe a UF com 2 letras.").max(2, "Informe a UF com 2 letras.")),
  approximateWeightKg: z.coerce.number().int().min(1).max(400).nullable().optional(),
  preferredGender: z.nativeEnum(GenderPreference),
  transferNeed: z.nativeEnum(TransferSupportLevel),
  mobilityNotes: optionalText(z.string().max(600, "As observacoes devem ter no maximo 600 caracteres."))
});

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
