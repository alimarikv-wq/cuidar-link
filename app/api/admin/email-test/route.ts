import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendEmailConfigurationTest } from "@/lib/care-notifications";

function summarizeProviderError(error: string) {
  if (error.includes("domain is not verified")) {
    return "O dominio do remetente ainda nao foi verificado no Resend.";
  }

  if (error.includes("You can only send testing emails")) {
    return "A conta do Resend ainda esta em modo de teste. Use um destinatario permitido ou verifique um dominio.";
  }

  if (error.includes("API key")) {
    return "A chave da API do Resend foi recusada.";
  }

  return "O Resend recusou o envio. Confira remetente, dominio e chave da API.";
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const result = await sendEmailConfigurationTest(user.email);

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        skipped: result.skipped,
        error: result.skipped ? result.error : summarizeProviderError(result.error)
      },
      { status: result.skipped ? 400 : 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "E-mail de teste aceito pelo Resend. Confira a caixa de entrada e o spam."
  });
}
