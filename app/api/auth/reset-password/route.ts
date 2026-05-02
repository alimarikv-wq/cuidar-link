import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordWithToken } from "@/lib/password-reset";

const resetPasswordSchema = z
  .object({
    token: z.string().min(32),
    password: z.string(),
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas precisam ser iguais.",
    path: ["confirmPassword"]
  });

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados invalidos." }, { status: 400 });
  }

  const result = await resetPasswordWithToken(parsed.data.token, parsed.data.password);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
