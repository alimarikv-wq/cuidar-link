import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/care-notifications";
import { isStrongPassword } from "@/lib/password-policy";

const resetTokenMinutes = 60;

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://cuidar-link.vercel.app";
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resetUrl(token: string) {
  const url = new URL("/reset-password", appUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: normalizedEmail,
        mode: "insensitive"
      }
    }
  });

  if (!user) {
    return { ok: true as const, userFound: false as const };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const url = resetUrl(token);
  const expiresAt = new Date(Date.now() + resetTokenMinutes * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: {
        lt: new Date()
      }
    }
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt
    }
  });

  const result = await sendEmail({
    to: user.email,
    subject: "Redefinicao de senha do CuidarLink",
    text: [
      `Ola, ${user.name}.`,
      "",
      "Recebemos uma solicitacao para redefinir sua senha no CuidarLink.",
      `Acesse este link em ate ${resetTokenMinutes} minutos:`,
      url,
      "",
      "Se voce nao pediu isso, pode ignorar este e-mail."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
        <h1 style="font-size:20px;margin:0 0 12px">Redefinir senha</h1>
        <p>Ola, <strong>${escapeHtml(user.name)}</strong>.</p>
        <p>Recebemos uma solicitacao para redefinir sua senha no CuidarLink.</p>
        <p>
          <a href="${url}" style="display:inline-block;background:#047857;color:#ffffff;padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:700">
            Criar nova senha
          </a>
        </p>
        <p>Este link vale por ${resetTokenMinutes} minutos. Se voce nao pediu isso, pode ignorar este e-mail.</p>
      </div>
    `
  });

  if (!result.ok) {
    return { ok: false as const, userFound: true as const, error: result.error };
  }

  return { ok: true as const, userFound: true as const };
}

export async function resetPasswordWithToken(token: string, password: string) {
  if (!isStrongPassword(password)) {
    return {
      ok: false as const,
      error: "A senha precisa ter 8 caracteres, letra maiuscula, minuscula, numero e caractere especial."
    };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash: hashResetToken(token)
    }
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false as const, error: "Link expirado ou invalido. Solicite uma nova redefinicao de senha." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: record.userId
      },
      data: {
        passwordHash: await hashPassword(password)
      }
    }),
    prisma.passwordResetToken.update({
      where: {
        id: record.id
      },
      data: {
        usedAt: new Date()
      }
    })
  ]);

  return { ok: true as const };
}
