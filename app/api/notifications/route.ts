import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import {
  getCareNotificationsForUser,
  getUnreadCareNotificationCount,
  markCareNotificationsRead
} from "@/lib/care-in-app-notifications";

const readSchema = z.object({
  notificationId: z.string().optional(),
  readAll: z.boolean().optional()
});

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para ver notificacoes." }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getCareNotificationsForUser(session.userId),
    getUnreadCareNotificationCount(session.userId)
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para atualizar notificacoes." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = readSchema.safeParse(body);

  if (!parsed.success || (!parsed.data.readAll && !parsed.data.notificationId)) {
    return NextResponse.json({ error: "Notificacao invalida." }, { status: 400 });
  }

  await markCareNotificationsRead(session.userId, parsed.data.readAll ? undefined : parsed.data.notificationId);

  return NextResponse.json({ success: true });
}
