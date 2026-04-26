import { AccountType, Gender, GenderPreference, ProfessionalType, TransferSupportLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authCookie, createSession, hashPassword } from "@/lib/auth";
import { createUserWithProfile } from "@/lib/onboarding";
import { isStrongPassword } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().refine(isStrongPassword, {
    message: "A senha precisa ter 8 caracteres, letra maiuscula, minuscula, numero e caractere especial."
  }),
  accountType: z.nativeEnum(AccountType).default(AccountType.PATIENT),
  phone: z.string().optional(),
  neighborhood: z.string().optional(),
  addressLine: z.string().optional(),
  approximateWeightKg: z.coerce.number().int().positive().optional(),
  preferredGender: z.nativeEnum(GenderPreference).default(GenderPreference.FEMININO),
  transferNeed: z.nativeEnum(TransferSupportLevel).default(TransferSupportLevel.ALTO),
  mobilityNotes: z.string().optional(),
  professionalType: z.nativeEnum(ProfessionalType).optional(),
  gender: z.nativeEnum(Gender).optional(),
  age: z.coerce.number().int().min(18).max(85).optional(),
  hourlyRate: z.coerce.number().positive().optional(),
  bio: z.string().optional(),
  mobilitySupport: z.string().optional()
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados invalidos." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "Este e-mail ja esta em uso." }, { status: 409 });
  }

  const user = await createUserWithProfile({
    ...parsed.data,
    email,
    passwordHash: await hashPassword(parsed.data.password)
  });

  const token = await createSession({ userId: user.id, role: user.role });
  const response = NextResponse.json({ success: true });
  response.cookies.set(authCookie(token));
  return response;
}
