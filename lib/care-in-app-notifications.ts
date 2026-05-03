import { CareRequestStatus, CareService, ProfessionalVerificationStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CareNotificationData } from "@/types";

const serviceLabel: Record<CareService, string> = {
  BANHO: "Banho",
  TRANSFERENCIA: "Transferencia",
  MEDICACAO: "Medicacao",
  CURATIVOS: "Curativos",
  FISIOTERAPIA: "Fisioterapia",
  COMPANHIA: "Companhia",
  REFEICAO: "Refeicao",
  SINAIS_VITAIS: "Sinais vitais",
  AVALIACAO: "Avaliacao",
  FORTALECIMENTO: "Fortalecimento",
  OUTRO: "Outro atendimento"
};

const statusLabel: Record<CareRequestStatus, string> = {
  RASCUNHO: "rascunho",
  ENVIADO: "enviado",
  ACEITO: "aceito",
  AGENDADO: "agendado",
  CONCLUIDO: "concluido",
  CANCELADO: "cancelado"
};

const documentStatusLabel: Record<VerificationStatus, string> = {
  PENDENTE: "enviado",
  VERIFICADO: "aprovado",
  RECUSADO: "reprovado"
};

const professionalStatusLabel: Record<ProfessionalVerificationStatus, string> = {
  PENDENTE: "pendente",
  EM_ANALISE: "em analise",
  APROVADO: "aprovado",
  REPROVADO: "reprovado"
};

type RequestNotificationPayload = {
  id: string;
  requesterName: string;
  service: CareService;
  status: CareRequestStatus;
  professional: {
    userId: string;
    user: {
      name: string;
    };
  };
  patientProfile?: {
    userId: string;
  } | null;
};

function toCareNotificationData(notification: {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
}): CareNotificationData {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    actionUrl: notification.actionUrl,
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    createdAt: notification.createdAt.toISOString()
  };
}

export async function createCareNotification(input: {
  userId: string;
  careRequestId?: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
}) {
  return prisma.careNotification.create({
    data: {
      userId: input.userId,
      careRequestId: input.careRequestId,
      type: input.type,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl || "/dashboard#notificacoes"
    }
  });
}

export async function notifyNewCareRequest(request: RequestNotificationPayload) {
  await createCareNotification({
    userId: request.professional.userId,
    careRequestId: request.id,
    type: "REQUEST_CREATED",
    title: "Novo pedido recebido",
    body: `${request.requesterName} solicitou ${serviceLabel[request.service]}.`,
    actionUrl: `/dashboard/atendimentos/${request.id}`
  });
}

export async function notifyCareRequestStatusForPatient(request: RequestNotificationPayload) {
  if (!request.patientProfile?.userId) return;

  await createCareNotification({
    userId: request.patientProfile.userId,
    careRequestId: request.id,
    type: `REQUEST_${request.status}`,
    title: `Pedido ${statusLabel[request.status]}`,
    body: `Seu atendimento com ${request.professional.user.name} foi atualizado para ${statusLabel[request.status]}.`,
    actionUrl: `/dashboard/atendimentos/${request.id}`
  });
}

export async function notifyCareRequestCanceledForProfessional(request: RequestNotificationPayload) {
  await createCareNotification({
    userId: request.professional.userId,
    careRequestId: request.id,
    type: "REQUEST_CANCELED_BY_PATIENT",
    title: "Pedido cancelado pelo paciente",
    body: `${request.requesterName} cancelou o pedido de ${serviceLabel[request.service]}.`,
    actionUrl: `/dashboard/atendimentos/${request.id}`
  });
}

export async function notifyProfessionalReview(userId: string, requestId: string, requesterName: string, rating: number) {
  await createCareNotification({
    userId,
    careRequestId: requestId,
    type: "REQUEST_REVIEWED",
    title: "Nova avaliacao recebida",
    body: `${requesterName} avaliou o atendimento com ${rating}/5.`,
    actionUrl: `/dashboard/atendimentos/${requestId}`
  });
}

export async function notifyProfessionalDocumentReview(userId: string, documentLabel: string, status: VerificationStatus) {
  await createCareNotification({
    userId,
    type: `DOCUMENT_${status}`,
    title: `Documento ${documentStatusLabel[status]}`,
    body: `${documentLabel} foi ${documentStatusLabel[status]} pela equipe administrativa.`,
    actionUrl: "/dashboard#documentos"
  });
}

export async function notifyProfessionalVerificationReview(userId: string, status: ProfessionalVerificationStatus) {
  await createCareNotification({
    userId,
    type: `PROFESSIONAL_VERIFICATION_${status}`,
    title: `Cadastro profissional ${professionalStatusLabel[status]}`,
    body: `Seu cadastro profissional foi marcado como ${professionalStatusLabel[status]}.`,
    actionUrl: "/dashboard#documentos"
  });
}

export async function getUnreadCareNotificationCount(userId: string) {
  return prisma.careNotification.count({
    where: {
      userId,
      readAt: null,
      archivedAt: null
    }
  });
}

export async function getCareNotificationsForUser(userId: string, take = 20) {
  const notifications = await prisma.careNotification.findMany({
    where: {
      userId,
      archivedAt: null
    },
    orderBy: { createdAt: "desc" },
    take
  });

  return notifications.map(toCareNotificationData);
}

export async function markCareNotificationsRead(userId: string, notificationId?: string) {
  await prisma.careNotification.updateMany({
    where: {
      userId,
      readAt: null,
      archivedAt: null,
      ...(notificationId ? { id: notificationId } : {})
    },
    data: {
      readAt: new Date()
    }
  });
}

export async function archiveCareNotification(userId: string, notificationId: string) {
  const now = new Date();

  await prisma.careNotification.updateMany({
    where: {
      userId,
      id: notificationId,
      archivedAt: null
    },
    data: {
      readAt: now,
      archivedAt: now
    }
  });
}

export async function archiveReadCareNotifications(userId: string) {
  await prisma.careNotification.updateMany({
    where: {
      userId,
      readAt: {
        not: null
      },
      archivedAt: null
    },
    data: {
      archivedAt: new Date()
    }
  });
}
