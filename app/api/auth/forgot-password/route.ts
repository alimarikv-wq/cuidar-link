import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/password-reset";

const forgotPasswordSchema = z.object({
  email: z.string().email("Informe um e-mail valido.")
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Informe um e-mail valido." }, { status: 400 });
  }

  const result = await requestPasswordReset(parsed.data.email);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Nao foi possivel enviar o e-mail agora. Tente novamente em alguns minutos." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha."
  });
}
