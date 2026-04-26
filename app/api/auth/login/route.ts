import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authCookie, createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user) {
    return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const token = await createSession({ userId: user.id, role: user.role });
  const response = NextResponse.json({ success: true });
  response.cookies.set(authCookie(token));
  return response;
}
