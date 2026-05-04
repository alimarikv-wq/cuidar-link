import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { createCareRequestMessageForUser, getCareRequestDetailsForUser } from "@/lib/care-data";

const messageSchema = z.object({
  body: z.string().trim().min(1).max(1000)
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para ver mensagens." }, { status: 401 });
  }

  const { id } = await params;
  const result = await getCareRequestDetailsForUser(id, session.userId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ messages: result.request.messages });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para enviar mensagem." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = messageSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Escreva uma mensagem de ate 1000 caracteres." }, { status: 400 });
  }

  const { id } = await params;
  const result = await createCareRequestMessageForUser(id, session.userId, parsed.data.body);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, message: result.message });
}
