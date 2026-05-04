import {
  AccountType,
  CareRequestStatus,
  CareService,
  DocumentType,
  Gender,
  GenderPreference,
  Prisma,
  ProfessionalInquiryStatus,
  ProfessionalType,
  ProfessionalVerificationStatus,
  TransferSupportLevel,
  UserRole,
  VerificationStatus
} from "@prisma/client";
import { AppHealthChecks, getAppHealthChecks } from "@/lib/app-health";
import { CARE_REQUEST_PAYMENT_AGREEMENT, CARE_REQUEST_PAYMENT_LABEL, CARE_REQUEST_RULES_VERSION } from "@/lib/care-request-disclosures";
import { maskCpf } from "@/lib/cpf";
import {
  sendCareMessageNotification,
  sendCareRequestStatusNotification,
  sendNewCareRequestNotifications,
  sendProfessionalInquiryNotification,
  sendProfessionalInquiryReplyNotification
} from "@/lib/care-notifications";
import {
  createCareNotification,
  getCareNotificationsForUser,
  getUnreadCareNotificationCount,
  notifyCareRequestCanceledForProfessional,
  notifyCareMessageReceived,
  notifyCareRequestStatusForPatient,
  notifyNewCareRequest,
  notifyProfessionalDocumentReview,
  notifyProfessionalReview,
  notifyProfessionalVerificationReview
} from "@/lib/care-in-app-notifications";
import { BRAZIL_TIME_ZONE, formatBrasiliaDateTime, parseBrasiliaDateTime } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { verifyProfessionalRegistration } from "@/lib/professional-registration-verifier";
import {
  AvailabilityFilter,
  AvailabilitySlotData,
  AdminDocumentReviewData,
  CareAdminOverview,
  CareDashboardData,
  CareMessageData,
  CareProfessional,
  ProfessionalInquiryDetailsData,
  ProfessionalInquiryMessageData,
  ProfessionalInquirySummary,
  CareRequestDetailsData,
  CareRequestRecord,
  DashboardFavoriteProfessional,
  DocumentTypeCode,
  VerificationStatusCode,
  ProfessionalDocumentData
} from "@/types";

const defaultCenter = {
  city: "Porto Alegre",
  neighborhood: "Zona Sul",
  latitude: -30.111947,
  longitude: -51.256708
};

const neighborhoodCoordinates: Record<string, { latitude: number; longitude: number }> = {
  Tristeza: { latitude: -30.106211, longitude: -51.250588 },
  Cavalhada: { latitude: -30.109725, longitude: -51.225471 },
  Cristal: { latitude: -30.084164, longitude: -51.246465 },
  Ipanema: { latitude: -30.128849, longitude: -51.239726 },
  "Menino Deus": { latitude: -30.055902, longitude: -51.223197 },
  Azenha: { latitude: -30.050192, longitude: -51.210693 }
};

const supportWeight: Record<TransferSupportLevel, number> = {
  MODERADO: 1,
  ALTO: 2,
  DUPLA: 3
};

const professionalTypeLabel: Record<ProfessionalType, string> = {
  CUIDADOR: "Cuidador",
  TECNICO_ENFERMAGEM: "Tecnico de enfermagem",
  FISIOTERAPEUTA: "Fisioterapeuta"
};

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

const genderLabel: Record<Gender, string> = {
  FEMININO: "Feminino",
  MASCULINO: "Masculino",
  OUTRO: "Outro"
};

const genderPreferenceLabel: Record<GenderPreference, string> = {
  FEMININO: "Mulher",
  MASCULINO: "Homem",
  QUALQUER: "Qualquer"
};

const supportLabel: Record<TransferSupportLevel, string> = {
  MODERADO: "Sem preferencia de porte fisico",
  ALTO: "Porte fisico forte",
  DUPLA: "Duas pessoas"
};

const statusLabel: Record<CareRequestStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  ACEITO: "Aceito",
  AGENDADO: "Agendado",
  CONCLUIDO: "Concluido",
  CANCELADO: "Cancelado"
};

const documentTypeLabel: Record<DocumentType, string> = {
  RG: "RG",
  CNH: "CNH",
  CPF: "CPF",
  COMPROVANTE_RESIDENCIA: "Comprovante de residencia",
  COREN: "COREN",
  CREFITO: "CREFITO",
  CERTIFICADO: "Certificado",
  REFERENCIA: "Referencia"
};

const verificationStatusLabel: Record<VerificationStatus, string> = {
  PENDENTE: "Enviado",
  VERIFICADO: "Aprovado",
  RECUSADO: "Reprovado"
};

const professionalVerificationStatusLabel: Record<ProfessionalVerificationStatus, string> = {
  PENDENTE: "Pendente",
  EM_ANALISE: "Em analise",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado"
};

const professionalInquiryStatusLabel: Record<ProfessionalInquiryStatus, string> = {
  ABERTA: "Aberta",
  RESPONDIDA: "Respondida",
  ARQUIVADA: "Arquivada"
};

const completionGraceMinutes = 1;

function toReadinessChecks(checks: AppHealthChecks): CareAdminOverview["readinessChecks"] {
  return [
    {
      key: "database",
      label: "Banco de dados",
      status: checks.database ? "OK" : "PENDING",
      detail: checks.database ? "Conectado e respondendo." : "Verificar DATABASE_URL e DIRECT_URL no Vercel."
    },
    {
      key: "googleOAuth",
      label: "Login com Google",
      status: checks.googleOAuth ? "OK" : "PENDING",
      detail: checks.googleOAuth ? "Configurado para cadastro e entrada." : "Falta configurar client ID e secret do Google."
    },
    {
      key: "documentStorage",
      label: "Documentos privados",
      status: checks.documentStorage ? "OK" : "PENDING",
      detail: checks.documentStorage ? "Storage privado pronto para documentos." : "Falta configurar Supabase URL e service role."
    },
    {
      key: "emailNotifications",
      label: "E-mails automaticos",
      status: checks.emailNotifications ? "OK" : "WARNING",
      detail: checks.emailNotifications ? "Pedidos e atualizacoes podem disparar e-mail." : "Configure Resend antes de testes com usuarios externos."
    },
    {
      key: "demoFallback",
      label: "Modo demonstracao",
      status: checks.demoFallback ? "WARNING" : "OK",
      detail: checks.demoFallback ? "Desative para nao misturar dados ficticios com producao." : "Desativado em producao."
    },
    {
      key: "appleOAuth",
      label: "Login com Apple",
      status: checks.appleOAuth ? "OK" : "WARNING",
      detail: checks.appleOAuth ? "Configurado." : "Opcional para o lancamento inicial; pode ficar para depois."
    }
  ];
}

function toOperationalAlerts(input: {
  unansweredRequests: number;
  staleUnansweredRequests: number;
  pendingDocuments: number;
  unverifiedActiveProfessionals: number;
  professionalsWithoutAvailability: number;
  activeProfessionalsMissingPhoto: number;
  emailNotifications: boolean;
}): CareAdminOverview["operationalAlerts"] {
  const alerts: CareAdminOverview["operationalAlerts"] = [];

  if (input.staleUnansweredRequests > 0) {
    alerts.push({
      key: "stale-unanswered-requests",
      severity: "ACTION",
      title: "Pedidos parados ha mais de 4 horas",
      detail: `${input.staleUnansweredRequests} pedido(s) enviados ainda sem aceite ou agendamento. Vale acionar o profissional.`,
      actionLabel: "Ver pedidos",
      actionHref: "/admin#pedidos-recentes"
    });
  } else if (input.unansweredRequests > 0) {
    alerts.push({
      key: "unanswered-requests",
      severity: "WARNING",
      title: "Pedidos aguardando resposta",
      detail: `${input.unansweredRequests} pedido(s) enviados ainda sem aceite ou agendamento.`,
      actionLabel: "Ver pedidos",
      actionHref: "/admin#pedidos-recentes"
    });
  }

  if (input.pendingDocuments > 0) {
    alerts.push({
      key: "pending-documents",
      severity: "ACTION",
      title: "Documentos para revisar",
      detail: `${input.pendingDocuments} documento(s) aguardando revisao administrativa.`,
      actionLabel: "Revisar documentos",
      actionHref: "/admin#documentos"
    });
  }

  if (input.unverifiedActiveProfessionals > 0) {
    alerts.push({
      key: "unverified-professionals",
      severity: "WARNING",
      title: "Profissionais ainda sem selo",
      detail: `${input.unverifiedActiveProfessionals} profissional(is) ativo(s) ainda nao aparecem como verificados.`,
      actionLabel: "Ver documentos",
      actionHref: "/admin#documentos"
    });
  }

  if (input.professionalsWithoutAvailability > 0) {
    alerts.push({
      key: "professionals-without-availability",
      severity: "WARNING",
      title: "Profissionais sem agenda",
      detail: `${input.professionalsWithoutAvailability} profissional(is) ativo(s) nao tem horario cadastrado. Eles quase nao aparecem em buscas por horario.`,
      actionLabel: "Ver profissionais",
      actionHref: "/admin#profissionais-operacao"
    });
  }

  if (input.activeProfessionalsMissingPhoto > 0) {
    alerts.push({
      key: "professionals-without-photo",
      severity: "INFO",
      title: "Perfis sem foto",
      detail: `${input.activeProfessionalsMissingPhoto} profissional(is) ativo(s) ainda nao colocaram foto. Isso reduz confianca na busca.`,
      actionLabel: "Ver profissionais",
      actionHref: "/admin#profissionais-operacao"
    });
  }

  if (!input.emailNotifications) {
    alerts.push({
      key: "email-notifications",
      severity: "ACTION",
      title: "E-mail automatico desligado",
      detail: "Pedidos e atualizacoes ficam menos confiaveis sem notificacao por e-mail.",
      actionLabel: "Testar e-mail",
      actionHref: "/admin#email"
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      key: "operational-ok",
      severity: "OK",
      title: "Operacao sem alerta critico",
      detail: "Nenhum pedido parado, documento pendente ou configuracao critica encontrada agora.",
      actionLabel: null,
      actionHref: null
    });
  }

  return alerts;
}

export type CareSearchParams = {
  service: CareService;
  professionalType?: ProfessionalType;
  genderPreference: GenderPreference;
  supportNeed: TransferSupportLevel;
  availability: AvailabilityFilter;
  radiusKm: number;
  travelRequested?: boolean;
  ageMin?: number;
  ageMax?: number;
  latitude?: number;
  longitude?: number;
};

export type CreateCareRequestInput = {
  professionalId: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  service: CareService;
  supportNeed: TransferSupportLevel;
  preferredGender: GenderPreference;
  scheduledFor?: string;
  durationHours?: number;
  addressLine: string;
  addressNumber?: string;
  addressComplement?: string;
  postalCode?: string;
  neighborhood: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  travelRequested?: boolean;
  travelDestination?: string;
  isInternationalTravel?: boolean;
  needsUsVisa?: boolean;
  travelNotes?: string;
  rulesAccepted?: boolean;
};

export type CreateProfessionalInquiryInput = {
  professionalId: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  body: string;
};

type ProfessionalWithRelations = Prisma.ProfessionalProfileGetPayload<{
  include: {
    user: true;
    documents: true;
    availability: true;
    reviews: {
      take: 3;
      orderBy: { createdAt: "desc" };
      include: {
        patientProfile: {
          include: {
            user: true;
          };
        };
      };
    };
  };
}>;

type CreateCareReviewInput = {
  rating: number;
  comment?: string;
};

type UpdateProfessionalProfileInput = {
  phone?: string;
  neighborhood: string;
  addressLine?: string;
  addressNumber?: string;
  addressComplement?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  serviceRadiusKm: number;
  hourlyRate: number;
  sessionRate?: number | null;
  bio: string;
  mobilitySupport: string;
  supportLevel: TransferSupportLevel;
  acceptsTravel: boolean;
  hasPassport: boolean;
  hasUsVisa: boolean;
  travelNotes?: string | null;
  services: CareService[];
  availability: AvailabilitySlotData[];
};

type CreateProfessionalDocumentInput = {
  type: DocumentType;
  cpf?: string;
  label?: string;
  documentNumber?: string;
  registrationUf?: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  expiresAt?: string;
  consentAccepted: boolean;
};

function coordinatesFor(neighborhood: string) {
  return neighborhoodCoordinates[neighborhood] ?? { latitude: defaultCenter.latitude, longitude: defaultCenter.longitude };
}

function requiredDocumentRulesFor(type: ProfessionalType): Array<{ type: DocumentTypeCode; label: string; matches: DocumentType[] }> {
  const base = [
    { type: "CPF" as const, label: "CPF", matches: [DocumentType.CPF] },
    { type: "RG" as const, label: "RG ou CNH", matches: [DocumentType.RG, DocumentType.CNH] },
    {
      type: "COMPROVANTE_RESIDENCIA" as const,
      label: "Comprovante de residencia",
      matches: [DocumentType.COMPROVANTE_RESIDENCIA]
    }
  ];

  if (type === ProfessionalType.TECNICO_ENFERMAGEM) {
    return [...base, { type: "COREN", label: "COREN", matches: [DocumentType.COREN] }];
  }

  if (type === ProfessionalType.FISIOTERAPEUTA) {
    return [...base, { type: "CREFITO", label: "CREFITO", matches: [DocumentType.CREFITO] }];
  }

  return [...base, { type: "CERTIFICADO", label: "Certificado", matches: [DocumentType.CERTIFICADO] }];
}

function toProfessionalDocumentData(document: {
  id: string;
  type: DocumentType;
  status: VerificationStatus;
  label: string;
  documentNumber: string | null;
  fileUrl: string | null;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  reviewNote: string | null;
  reviewedAt: Date | null;
  externalCheckStatus: string | null;
  externalCheckSource: string | null;
  externalCheckMessage: string | null;
}): ProfessionalDocumentData {
  return {
    id: document.id,
    type: document.type,
    typeLabel: documentTypeLabel[document.type],
    status: document.status,
    statusLabel: verificationStatusLabel[document.status],
    label: document.label,
    documentNumber: document.documentNumber,
    fileUrl: document.fileUrl,
    downloadUrl: document.storagePath ? `/api/professional-documents/${document.id}/download` : document.fileUrl,
    fileName: document.fileName,
    mimeType: document.mimeType,
    fileSize: document.fileSize,
    expiresAt: document.expiresAt ? document.expiresAt.toISOString() : null,
    createdAt: document.createdAt.toISOString(),
    reviewNote: document.reviewNote,
    reviewedAt: document.reviewedAt ? document.reviewedAt.toISOString() : null,
    externalCheckStatus: document.externalCheckStatus,
    externalCheckSource: document.externalCheckSource,
    externalCheckMessage: document.externalCheckMessage
  };
}

function requiredDocumentStatus(
  professionalType: ProfessionalType,
  documents: Array<{ type: DocumentType; status: VerificationStatus }>
): Array<{ type: DocumentTypeCode; label: string; status: VerificationStatusCode | "FALTANDO" }> {
  return requiredDocumentRulesFor(professionalType).map((rule) => {
    const matchingDocuments = documents.filter((document) => rule.matches.includes(document.type));
    const status: VerificationStatusCode | "FALTANDO" = matchingDocuments.some((document) => document.status === VerificationStatus.VERIFICADO)
      ? "VERIFICADO"
      : matchingDocuments.some((document) => document.status === VerificationStatus.PENDENTE)
        ? "PENDENTE"
        : matchingDocuments.some((document) => document.status === VerificationStatus.RECUSADO)
          ? "RECUSADO"
          : "FALTANDO";

    return {
      type: rule.type,
      label: rule.label,
      status
    };
  });
}

async function refreshProfessionalVerification(professionalId: string) {
  const professional = await prisma.professionalProfile.findUnique({
    where: { id: professionalId },
    include: { documents: true }
  });

  if (!professional) return;

  const requiredDocumentsVerified = requiredDocumentRulesFor(professional.professionalType).every((rule) =>
    professional.documents.some((document) => rule.matches.includes(document.type) && document.status === VerificationStatus.VERIFICADO)
  );
  const isVerified = professional.verificationStatus === ProfessionalVerificationStatus.APROVADO && requiredDocumentsVerified;

  await prisma.professionalProfile.update({
    where: { id: professionalId },
    data: { isVerified }
  });
}

export function getCareCenter() {
  return defaultCenter;
}

export function parseCareService(value: string | null): CareService {
  return Object.values(CareService).includes(value as CareService) ? (value as CareService) : CareService.BANHO;
}

export function parseProfessionalType(value: string | null) {
  return Object.values(ProfessionalType).includes(value as ProfessionalType) ? (value as ProfessionalType) : undefined;
}

export function parseGenderPreference(value: string | null): GenderPreference {
  return Object.values(GenderPreference).includes(value as GenderPreference)
    ? (value as GenderPreference)
    : GenderPreference.QUALQUER;
}

export function parseSupportLevel(value: string | null): TransferSupportLevel {
  return Object.values(TransferSupportLevel).includes(value as TransferSupportLevel)
    ? (value as TransferSupportLevel)
    : TransferSupportLevel.MODERADO;
}

export function parseAvailability(value: string | null): AvailabilityFilter {
  const allowed: AvailabilityFilter[] = ["qualquer", "agora", "hoje", "manha", "tarde", "noite", "fim-de-semana"];
  return allowed.includes(value as AvailabilityFilter) ? (value as AvailabilityFilter) : "qualquer";
}

export function getServiceLabel(service: CareService) {
  return serviceLabel[service];
}

export function getProfessionalTypeLabel(type: ProfessionalType) {
  return professionalTypeLabel[type];
}

export function getSupportLabel(level: TransferSupportLevel) {
  return supportLabel[level];
}

function canSupport(professionalLevel: TransferSupportLevel, requestedLevel: TransferSupportLevel) {
  return supportWeight[professionalLevel] >= supportWeight[requestedLevel];
}

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const earthRadius = 6371;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function slotEndToMinutes(value: string) {
  return value === "23:59" ? 24 * 60 : timeToMinutes(value);
}

function minutesToTime(value: number) {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, value));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getBrasiliaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function getBrasiliaMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hours = Number(byType.hour === "24" ? "0" : byType.hour);
  return hours * 60 + Number(byType.minute || 0);
}

function getWeekdayFromBrasiliaDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00-03:00`).getUTCDay();
}

function addDaysToBrasiliaDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00-03:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return getBrasiliaDateKey(date);
}

function dateFromBrasiliaDateAndMinutes(dateKey: string, minutes: number) {
  return new Date(`${dateKey}T${minutesToTime(minutes)}:00-03:00`);
}

function requestEnd(start: Date, durationHours: number | Prisma.Decimal) {
  return new Date(start.getTime() + Number(durationHours) * 60 * 60 * 1000);
}

function completionAvailableAt(start: Date, durationHours: number | Prisma.Decimal) {
  return new Date(requestEnd(start, durationHours).getTime() + completionGraceMinutes * 60 * 1000);
}

function scheduleTimestamps(scheduledFor: Date | null, durationHours: number | Prisma.Decimal) {
  if (!scheduledFor) {
    return {
      scheduledEndAt: null,
      completionAvailableAt: null
    };
  }

  return {
    scheduledEndAt: requestEnd(scheduledFor, durationHours),
    completionAvailableAt: completionAvailableAt(scheduledFor, durationHours)
  };
}

function requestCompletionAvailableAt(request: {
  scheduledFor: Date | null;
  scheduledEndAt?: Date | null;
  completionAvailableAt?: Date | null;
  durationHours: number | Prisma.Decimal;
}) {
  if (request.completionAvailableAt) return request.completionAvailableAt;
  if (!request.scheduledFor) return null;
  return completionAvailableAt(request.scheduledFor, request.durationHours);
}

function canCompleteRequestNow(request: {
  scheduledFor: Date | null;
  completionAvailableAt?: Date | null;
  durationHours: number | Prisma.Decimal;
}) {
  const availableAt = requestCompletionAvailableAt(request);
  return Boolean(availableAt && Date.now() >= availableAt.getTime());
}

function completionGateLabelFor(request: {
  scheduledFor: Date | null;
  completionAvailableAt?: Date | null;
  durationHours: number | Prisma.Decimal;
}) {
  const availableAt = requestCompletionAvailableAt(request);
  if (!availableAt) return "Informe data e horario para liberar conclusao.";
  if (Date.now() >= availableAt.getTime()) return null;
  return `Conclusao liberada a partir de ${formatBrasiliaDateTime(availableAt)}.`;
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

async function getActiveRequestsForProfessionalDay(professionalId: string, dateKey: string) {
  const dayStart = new Date(`${dateKey}T00:00:00-03:00`);
  const nextDayStart = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return prisma.careRequest.findMany({
    where: {
      professionalId,
      scheduledFor: {
        gte: dayStart,
        lt: nextDayStart
      },
      status: { in: [CareRequestStatus.ENVIADO, CareRequestStatus.ACEITO, CareRequestStatus.AGENDADO] }
    },
    select: {
      id: true,
      scheduledFor: true,
      durationHours: true
    },
    orderBy: { scheduledFor: "asc" }
  });
}

function isCoveredByAvailability(
  availability: Array<{ weekday: number; startTime: string; endTime: string }>,
  start: Date,
  durationHours: number
) {
  if (availability.length === 0) return true;

  const dateKey = getBrasiliaDateKey(start);
  const weekday = getWeekdayFromBrasiliaDateKey(dateKey);
  const startMinutes = getBrasiliaMinutes(start);
  const endMinutes = startMinutes + durationHours * 60;

  return availability.some((slot) => {
    return slot.weekday === weekday && startMinutes >= timeToMinutes(slot.startTime) && endMinutes <= slotEndToMinutes(slot.endTime);
  });
}

export async function getAvailableCareRequestSlots(professionalId: string, dateKey: string, durationHours = 2) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || durationHours < 0.5 || durationHours > 24) {
    return [];
  }

  const professional = await prisma.professionalProfile.findUnique({
    where: { id: professionalId },
    include: {
      availability: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }
    }
  });

  if (!professional || !professional.isActive) return [];

  const weekday = getWeekdayFromBrasiliaDateKey(dateKey);
  const daySlots =
    professional.availability.length === 0
      ? [{ weekday, startTime: "00:00", endTime: "23:59" }]
      : professional.availability.filter((slot) => slot.weekday === weekday);
  if (daySlots.length === 0) return [];

  const busyRequests = await getActiveRequestsForProfessionalDay(professionalId, dateKey);
  const busyRanges = busyRequests
    .filter((request) => request.scheduledFor)
    .map((request) => ({
      start: request.scheduledFor!,
      end: requestEnd(request.scheduledFor!, request.durationHours)
    }));
  const now = new Date();
  const durationMinutes = Math.round(durationHours * 60);

  const availableTimes: string[] = [];
  for (const slot of daySlots) {
    const slotStart = timeToMinutes(slot.startTime);
    const slotEnd = slotEndToMinutes(slot.endTime);

    for (let minutes = slotStart; minutes + durationMinutes <= slotEnd; minutes += 30) {
      const candidateStart = dateFromBrasiliaDateAndMinutes(dateKey, minutes);
      if (candidateStart <= now) continue;

      const candidateEnd = requestEnd(candidateStart, durationHours);
      const overlaps = busyRanges.some((range) => rangesOverlap(candidateStart, candidateEnd, range.start, range.end));
      if (!overlaps) availableTimes.push(minutesToTime(minutes));
    }
  }

  return [...new Set(availableTimes)];
}

export async function getNextAvailableCareRequestSlots(professionalId: string, dateKey: string, durationHours = 2, lookAheadDays = 21) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || durationHours < 0.5 || durationHours > 24) {
    return { date: dateKey, slots: [] };
  }

  const daysToSearch = Math.min(Math.max(Math.round(lookAheadDays), 0), 45);
  for (let days = 0; days <= daysToSearch; days += 1) {
    const candidateDate = addDaysToBrasiliaDateKey(dateKey, days);
    const slots = await getAvailableCareRequestSlots(professionalId, candidateDate, durationHours);
    if (slots.length > 0) return { date: candidateDate, slots };
  }

  return { date: dateKey, slots: [] };
}

async function validateCareRequestSchedule(professionalId: string, scheduledFor: Date | null, durationHours: number) {
  if (!scheduledFor) return { ok: false as const, error: "Informe data e horario do atendimento." };
  if (scheduledFor <= new Date()) return { ok: false as const, error: "Escolha um horario futuro." };

  const professional = await prisma.professionalProfile.findUnique({
    where: { id: professionalId },
    include: { availability: true }
  });

  if (!professional || !professional.isActive) return { ok: false as const, error: "Profissional indisponivel no momento." };

  if (!isCoveredByAvailability(professional.availability, scheduledFor, durationHours)) {
    return {
      ok: false as const,
      error: "Esse horario nao esta dentro da agenda cadastrada pelo profissional. Escolha outro horario disponivel."
    };
  }

  const dateKey = getBrasiliaDateKey(scheduledFor);
  const requestStart = scheduledFor;
  const requestEndDate = requestEnd(requestStart, durationHours);
  const busyRequests = await getActiveRequestsForProfessionalDay(professionalId, dateKey);
  const hasConflict = busyRequests.some((request) => {
    if (!request.scheduledFor) return false;
    return rangesOverlap(requestStart, requestEndDate, request.scheduledFor, requestEnd(request.scheduledFor, request.durationHours));
  });

  if (hasConflict) {
    return { ok: false as const, error: "Esse horario acabou de ficar ocupado. Escolha outro horario disponivel." };
  }

  return { ok: true as const };
}

function slotMatchesAvailability(slot: { weekday: number; startTime: string; endTime: string }, filter: AvailabilityFilter) {
  if (filter === "qualquer") return true;

  const now = new Date();
  const weekday = getWeekdayFromBrasiliaDateKey(getBrasiliaDateKey(now));
  const nowMinutes = getBrasiliaMinutes(now);
  const start = timeToMinutes(slot.startTime);
  const end = slotEndToMinutes(slot.endTime);

  if (filter === "fim-de-semana") return slot.weekday === 0 || slot.weekday === 6;
  if (filter === "hoje") return slot.weekday === weekday;
  if (filter === "agora") return slot.weekday === weekday && start <= nowMinutes && end >= nowMinutes;
  if (filter === "manha") return start < 12 * 60;
  if (filter === "tarde") return start < 18 * 60 && end > 12 * 60;
  if (filter === "noite") return end >= 18 * 60;
  return true;
}

function availabilityLabel(professional: ProfessionalWithRelations, filter: AvailabilityFilter) {
  if (professional.availability.length === 0) return "Sob consulta";
  if (filter === "qualquer") return "Agenda flexivel";
  if (filter === "agora") return "Agora";
  if (filter === "hoje") return "Hoje";
  const matchingSlot = professional.availability.find((slot) => slotMatchesAvailability(slot, filter));
  if (!matchingSlot) return "Sob consulta";
  return `${matchingSlot.startTime} - ${matchingSlot.endTime}`;
}

function professionalMatchesAvailability(professional: ProfessionalWithRelations, filter: AvailabilityFilter) {
  if (filter === "qualquer") return true;
  if (professional.availability.length === 0) return filter !== "agora";
  return professional.availability.some((slot) => slotMatchesAvailability(slot, filter));
}

function calculateScore(
  professional: ProfessionalWithRelations,
  distance: number,
  params: CareSearchParams,
  hasAvailability: boolean
) {
  let score = 52;
  if (params.service === CareService.OUTRO) score += 8;
  if (params.service !== CareService.OUTRO && professional.services.includes(params.service)) score += 18;
  if (params.genderPreference === GenderPreference.QUALQUER || professional.gender === params.genderPreference) score += 10;
  if (canSupport(professional.supportLevel, params.supportNeed)) score += 12;
  if (hasAvailability) score += 8;
  if (professional.isVerified) score += 4;
  if (params.travelRequested && professional.acceptsTravel) score += 6;
  score += Math.max(0, 10 - distance);
  score += Number(professional.rating) - 4.5;
  return Math.round(Math.min(score, 99));
}

function toCareProfessional(professional: ProfessionalWithRelations, params: CareSearchParams, distance: number): CareProfessional {
  const hasAvailability = professional.availability.some((slot) => slotMatchesAvailability(slot, params.availability));
  const verifiedDocs = professional.documents.filter((document) => document.status === "VERIFICADO");
  const price = "Sob consulta";

  return {
    id: professional.id,
    name: professional.user.name,
    professionalType: professional.professionalType,
    roleLabel: professionalTypeLabel[professional.professionalType],
    gender: professional.gender,
    genderLabel: genderLabel[professional.gender],
    age: professional.age,
    city: professional.city,
    neighborhood: professional.neighborhood,
    latitude: Number(professional.latitude),
    longitude: Number(professional.longitude),
    distanceKm: Number(distance.toFixed(1)),
    photoUrl: professional.photoUrl,
    rating: Number(professional.rating),
    reviewCount: professional.reviewCount,
    priceLabel: price,
    availableIn: availabilityLabel(professional, params.availability),
    responseTimeLabel: `${professional.responseMinutes} min`,
    supportLevel: professional.supportLevel,
    supportLevelLabel: supportLabel[professional.supportLevel],
    mobilitySupport: professional.mobilitySupport,
    acceptsTravel: professional.acceptsTravel,
    hasPassport: professional.hasPassport,
    hasUsVisa: professional.hasUsVisa,
    travelNotes: professional.travelNotes,
    services: professional.services,
    serviceLabels: professional.services.map((service) => serviceLabel[service]),
    credentials: verifiedDocs.map((document) => document.label),
    bio: professional.bio,
    isVerified: professional.isVerified,
    matchScore: calculateScore(professional, distance, params, hasAvailability),
    recentReviews: professional.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      reviewerName: review.patientProfile?.user.name || "Paciente",
      createdAt: review.createdAt.toISOString()
    }))
  };
}

export async function searchCareProfessionals(params: CareSearchParams) {
  const latitude = params.latitude ?? defaultCenter.latitude;
  const longitude = params.longitude ?? defaultCenter.longitude;

  const candidates = await prisma.professionalProfile.findMany({
    where: {
      isActive: true,
      services: params.service === CareService.OUTRO ? undefined : { has: params.service },
      professionalType: params.professionalType,
      age: {
        gte: params.ageMin,
        lte: params.ageMax
      },
      gender:
        params.genderPreference === GenderPreference.QUALQUER
          ? undefined
          : params.genderPreference === GenderPreference.FEMININO
            ? Gender.FEMININO
            : Gender.MASCULINO,
      acceptsTravel: params.travelRequested ? true : undefined
    },
    include: {
      user: true,
      documents: { orderBy: { createdAt: "asc" } },
      availability: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          patientProfile: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  return candidates
    .map((professional) => ({
      professional,
      distance: distanceKm(latitude, longitude, Number(professional.latitude), Number(professional.longitude)),
      hasAvailability: professionalMatchesAvailability(professional, params.availability)
    }))
    .filter(({ distance, professional, hasAvailability }) => {
      return (
        distance <= params.radiusKm &&
        distance <= professional.serviceRadiusKm &&
        canSupport(professional.supportLevel, params.supportNeed) &&
        (!params.travelRequested || professional.acceptsTravel) &&
        hasAvailability
      );
    })
    .map(({ professional, distance }) => toCareProfessional(professional, params, distance))
    .sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm);
}

export async function createCareRequest(input: CreateCareRequestInput, userId?: string) {
  let patientProfileId: string | undefined;
  let requesterName = input.requesterName;
  let requesterEmail = input.requesterEmail;
  const durationHours = input.durationHours ?? 2;
  const scheduledFor = input.scheduledFor ? parseBrasiliaDateTime(input.scheduledFor) : null;
  const schedule = scheduleTimestamps(scheduledFor, durationHours);

  if (!input.rulesAccepted) {
    return { ok: false as const, status: 400, error: "Leia e aceite as regras do atendimento para enviar o pedido." };
  }

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { patientProfile: true }
    });

    if (user) {
      requesterName = input.requesterName || user.name;
      requesterEmail = input.requesterEmail || user.email;
      patientProfileId = user.patientProfile?.id;
    }
  }

  const scheduleValidation = await validateCareRequestSchedule(input.professionalId, scheduledFor, durationHours);
  if (!scheduleValidation.ok) {
    return { ok: false as const, status: 409, error: scheduleValidation.error };
  }

  if (input.travelRequested) {
    if (!input.travelDestination?.trim()) {
      return { ok: false as const, status: 400, error: "Informe o destino da viagem." };
    }

    const professionalTravel = await prisma.professionalProfile.findUnique({
      where: { id: input.professionalId },
      select: { acceptsTravel: true, hasPassport: true, hasUsVisa: true }
    });

    if (!professionalTravel?.acceptsTravel) {
      return { ok: false as const, status: 409, error: "Esse profissional nao marcou disponibilidade para viagens." };
    }

    if (input.isInternationalTravel && !professionalTravel.hasPassport) {
      return { ok: false as const, status: 409, error: "Esse profissional nao informou passaporte para viagem internacional." };
    }

    if (input.needsUsVisa && !professionalTravel.hasUsVisa) {
      return { ok: false as const, status: 409, error: "Esse profissional nao informou visto americano." };
    }
  }

  const request = await prisma.careRequest.create({
    data: {
      patientProfileId,
      professionalId: input.professionalId,
      requesterName,
      requesterEmail,
      requesterPhone: input.requesterPhone,
      service: input.service,
      supportNeed: input.supportNeed,
      preferredGender: input.preferredGender,
      scheduledFor,
      scheduledEndAt: schedule.scheduledEndAt,
      completionAvailableAt: schedule.completionAvailableAt,
      durationHours,
      addressLine: input.addressLine,
      addressNumber: input.addressNumber,
      addressComplement: input.addressComplement,
      postalCode: input.postalCode,
      neighborhood: input.neighborhood,
      city: input.city || defaultCenter.city,
      state: input.state,
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes,
      travelRequested: Boolean(input.travelRequested),
      travelDestination: input.travelRequested ? input.travelDestination : null,
      isInternationalTravel: Boolean(input.isInternationalTravel),
      needsUsVisa: Boolean(input.needsUsVisa),
      travelNotes: input.travelRequested ? input.travelNotes : null,
      rulesAcceptedAt: new Date(),
      rulesVersion: CARE_REQUEST_RULES_VERSION,
      paymentAgreement: CARE_REQUEST_PAYMENT_AGREEMENT,
      status: CareRequestStatus.ENVIADO
    },
    include: {
      professional: {
        include: { user: true }
      }
    }
  });

  try {
    await notifyNewCareRequest(request);
  } catch (error) {
    console.error("Nao foi possivel criar notificacao interna do novo atendimento.", error);
  }

  try {
    await sendNewCareRequestNotifications(request);
  } catch (error) {
    console.error("Nao foi possivel enviar notificacao do novo atendimento.", error);
  }

  return { ok: true as const, request };
}

function toRequestRecord(
  request: Prisma.CareRequestGetPayload<{ include: { professional: { include: { user: true } } } }>,
  archivedAt: Date | null = null,
  deletedAt: Date | null = null
): CareRequestRecord {
  return {
    id: request.id,
    status: request.status,
    statusLabel: statusLabel[request.status],
    archivedAt: archivedAt ? archivedAt.toISOString() : null,
    deletedAt: deletedAt ? deletedAt.toISOString() : null,
    serviceLabel: serviceLabel[request.service],
    durationHours: Number(request.durationHours),
    scheduledFor: request.scheduledFor ? request.scheduledFor.toISOString() : null,
    scheduledEndAt: request.scheduledEndAt
      ? request.scheduledEndAt.toISOString()
      : request.scheduledFor
        ? requestEnd(request.scheduledFor, request.durationHours).toISOString()
        : null,
    completionAvailableAt: requestCompletionAvailableAt(request)?.toISOString() || null,
    completedAt: request.completedAt ? request.completedAt.toISOString() : null,
    completedById: request.completedById,
    canCompleteNow: canCompleteRequestNow(request),
    completionGateLabel: completionGateLabelFor(request),
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    requesterName: request.requesterName,
    requesterPhone: request.requesterPhone,
    addressLine: request.addressLine,
    addressNumber: request.addressNumber,
    addressComplement: request.addressComplement,
    postalCode: request.postalCode,
    city: request.city,
    state: request.state,
    notes: request.notes,
    travelRequested: request.travelRequested,
    travelDestination: request.travelDestination,
    isInternationalTravel: request.isInternationalTravel,
    needsUsVisa: request.needsUsVisa,
    travelNotes: request.travelNotes,
    rulesAcceptedAt: request.rulesAcceptedAt ? request.rulesAcceptedAt.toISOString() : null,
    rulesVersion: request.rulesVersion,
    paymentAgreement: request.paymentAgreement,
    paymentAgreementLabel: request.paymentAgreement === CARE_REQUEST_PAYMENT_AGREEMENT ? CARE_REQUEST_PAYMENT_LABEL : "Pagamento a combinar",
    professionalName: request.professional.user.name,
    professionalRole: professionalTypeLabel[request.professional.professionalType],
    neighborhood: request.neighborhood
  };
}

function toRequestDetailsData(
  request: Prisma.CareRequestGetPayload<{
    include: {
      professional: {
        include: {
          user: true;
        };
      };
      patientProfile: {
        include: {
          user: true;
        };
      };
      review: true;
      messages: {
        include: {
          sender: true;
        };
      };
    };
  }>,
  viewer: CareRequestDetailsData["viewer"]
): CareRequestDetailsData {
  const archivedAt = viewer.canActAsProfessional ? request.professionalArchivedAt : request.patientArchivedAt;
  const deletedAt = viewer.canActAsProfessional ? request.professionalDeletedAt : request.patientDeletedAt;

  return {
    ...toRequestRecord(request, archivedAt, deletedAt),
    requesterEmail: request.requesterEmail,
    supportNeedLabel: supportLabel[request.supportNeed],
    preferredGenderLabel: genderPreferenceLabel[request.preferredGender],
    professional: {
      id: request.professional.id,
      name: request.professional.user.name,
      email: request.professional.user.email,
      phone: request.professional.phone,
      roleLabel: professionalTypeLabel[request.professional.professionalType],
      genderLabel: genderLabel[request.professional.gender],
      age: request.professional.age,
      neighborhood: request.professional.neighborhood,
      city: request.professional.city,
      supportLevelLabel: supportLabel[request.professional.supportLevel],
      mobilitySupport: request.professional.mobilitySupport,
      bio: request.professional.bio,
      isVerified: request.professional.isVerified,
      acceptsTravel: request.professional.acceptsTravel,
      hasPassport: request.professional.hasPassport,
      hasUsVisa: request.professional.hasUsVisa,
      travelNotes: request.professional.travelNotes
    },
    patient: {
      name: request.requesterName || request.patientProfile?.user.name || "Paciente",
      email: request.requesterEmail || request.patientProfile?.user.email || null,
      phone: request.requesterPhone
    },
    review: request.review
      ? {
          id: request.review.id,
          rating: request.review.rating,
          comment: request.review.comment,
          createdAt: request.review.createdAt.toISOString()
        }
      : null,
    messages: request.messages.map((message) => toCareMessageData(message, viewer.userId)),
    viewer
  };
}

function toCareMessageData(
  message: Prisma.CareMessageGetPayload<{ include: { sender: true } }>,
  viewerUserId: string
): CareMessageData {
  return {
    id: message.id,
    senderId: message.senderId,
    senderName: message.sender.name,
    body: message.body,
    isOwn: message.senderId === viewerUserId,
    readAt: message.readAt ? message.readAt.toISOString() : null,
    createdAt: message.createdAt.toISOString()
  };
}

function toProfessionalInquiryMessageData(
  message: Prisma.ProfessionalInquiryMessageGetPayload<{ include: { sender: true } }>,
  viewerUserId: string
): ProfessionalInquiryMessageData {
  return {
    id: message.id,
    senderId: message.senderId,
    senderName: message.sender?.name || message.senderName,
    body: message.body,
    isOwn: message.senderId === viewerUserId,
    readAt: message.readAt ? message.readAt.toISOString() : null,
    createdAt: message.createdAt.toISOString()
  };
}

function toProfessionalInquirySummary(
  inquiry: Prisma.ProfessionalInquiryGetPayload<{
    include: {
      professional: { include: { user: true } };
      messages: { include: { sender: true } };
    };
  }>,
  viewerUserId: string,
  archivedAt: Date | null = null
): ProfessionalInquirySummary {
  const messages = [...inquiry.messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const lastMessage = messages[messages.length - 1];
  const lastMessageBody = lastMessage?.body || "Mensagem inicial enviada.";

  return {
    id: inquiry.id,
    status: inquiry.status,
    statusLabel: professionalInquiryStatusLabel[inquiry.status],
    archivedAt: archivedAt ? archivedAt.toISOString() : null,
    professionalName: inquiry.professional.user.name,
    professionalRole: professionalTypeLabel[inquiry.professional.professionalType],
    requesterName: inquiry.requesterName,
    requesterEmail: inquiry.requesterEmail,
    requesterPhone: inquiry.requesterPhone,
    lastMessage: lastMessageBody.length > 180 ? `${lastMessageBody.slice(0, 180)}...` : lastMessageBody,
    lastMessageAt: (lastMessage?.createdAt || inquiry.updatedAt).toISOString(),
    createdAt: inquiry.createdAt.toISOString(),
    unreadCount: messages.filter((message) => message.senderId !== viewerUserId && !message.readAt).length
  };
}

function toProfessionalInquiryDetailsData(
  inquiry: Prisma.ProfessionalInquiryGetPayload<{
    include: {
      professional: { include: { user: true } };
      patientProfile: { include: { user: true } };
      messages: { include: { sender: true } };
    };
  }>,
  viewer: ProfessionalInquiryDetailsData["viewer"]
): ProfessionalInquiryDetailsData {
  const archivedAt = viewer.canActAsProfessional ? inquiry.professionalArchivedAt : inquiry.patientArchivedAt;

  return {
    ...toProfessionalInquirySummary(inquiry, viewer.userId, archivedAt),
    professional: {
      id: inquiry.professional.id,
      name: inquiry.professional.user.name,
      email: inquiry.professional.user.email,
      phone: inquiry.professional.phone,
      roleLabel: professionalTypeLabel[inquiry.professional.professionalType],
      isVerified: inquiry.professional.isVerified
    },
    patient: {
      name: inquiry.requesterName || inquiry.patientProfile?.user.name || "Paciente",
      email: inquiry.requesterEmail || inquiry.patientProfile?.user.email || null,
      phone: inquiry.requesterPhone
    },
    messages: inquiry.messages.map((message) => toProfessionalInquiryMessageData(message, viewer.userId)),
    viewer
  };
}

export async function createProfessionalInquiryForUser(input: CreateProfessionalInquiryInput, userId?: string) {
  const requesterName = input.requesterName.trim();
  const requesterEmail = input.requesterEmail?.trim().toLowerCase() || "";
  const requesterPhone = input.requesterPhone?.trim() || "";
  const body = input.body.trim();

  if (requesterName.length < 2) {
    return { ok: false as const, status: 400, error: "Informe o nome de quem esta entrando em contato." };
  }

  if (!requesterEmail && !requesterPhone) {
    return { ok: false as const, status: 400, error: "Informe e-mail ou telefone para o profissional responder." };
  }

  if (requesterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
    return { ok: false as const, status: 400, error: "Informe um e-mail valido." };
  }

  if (body.length < 1 || body.length > 1000) {
    return { ok: false as const, status: 400, error: "Escreva uma mensagem de ate 1000 caracteres." };
  }

  const [user, professional] = await Promise.all([
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          include: { patientProfile: true, professionalProfile: true }
        })
      : null,
    prisma.professionalProfile.findUnique({
      where: { id: input.professionalId },
      include: { user: true }
    })
  ]);

  if (!professional || !professional.isActive) {
    return { ok: false as const, status: 404, error: "Profissional nao encontrado." };
  }

  const inquiry = await prisma.professionalInquiry.create({
    data: {
      patientProfileId: user?.patientProfile?.id || null,
      professionalId: professional.id,
      requesterName,
      requesterEmail: requesterEmail || user?.email || null,
      requesterPhone: requesterPhone || user?.patientProfile?.phone || null,
      status: ProfessionalInquiryStatus.ABERTA,
      messages: {
        create: {
          senderId: user?.id || null,
          senderName: user?.name || requesterName,
          senderEmail: user?.email || requesterEmail || null,
          body
        }
      }
    },
    include: {
      professional: { include: { user: true } },
      messages: { include: { sender: true }, orderBy: { createdAt: "asc" } }
    }
  });

  try {
    await createCareNotification({
      userId: professional.userId,
      type: "PROFESSIONAL_INQUIRY_CREATED",
      title: "Nova mensagem antes do pedido",
      body: `${requesterName} enviou uma duvida antes de solicitar atendimento.`,
      actionUrl: `/dashboard/mensagens/${inquiry.id}`
    });
  } catch (error) {
    console.error("Nao foi possivel criar notificacao interna de mensagem inicial.", error);
  }

  try {
    await sendProfessionalInquiryNotification({
      to: professional.user.email,
      professionalName: professional.user.name,
      requesterName,
      requesterEmail: requesterEmail || user?.email || null,
      requesterPhone: requesterPhone || user?.patientProfile?.phone || null,
      inquiryId: inquiry.id,
      body
    });
  } catch (error) {
    console.error("Nao foi possivel enviar e-mail de mensagem inicial.", error);
  }

  return {
    ok: true as const,
    inquiry: toProfessionalInquirySummary(inquiry, user?.id || "")
  };
}

export async function getProfessionalInquiriesForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return [];

  const isProfessional = user.accountType === AccountType.PROFESSIONAL && user.professionalProfile;
  const where = isProfessional
    ? { professionalId: user.professionalProfile!.id, professionalArchivedAt: null }
    : {
        patientArchivedAt: null,
        OR: [
          ...(user.patientProfile?.id ? [{ patientProfileId: user.patientProfile.id }] : []),
          { requesterEmail: user.email.toLowerCase() }
        ]
      };

  const inquiries = await prisma.professionalInquiry.findMany({
    where,
    include: {
      professional: { include: { user: true } },
      messages: {
        include: { sender: true },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 30
  });

  return inquiries.map((inquiry) =>
    toProfessionalInquirySummary(inquiry, user.id, isProfessional ? inquiry.professionalArchivedAt : inquiry.patientArchivedAt)
  );
}

export async function getProfessionalInquiryDetailsForUser(inquiryId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return { ok: false as const, status: 401, error: "Sessao invalida." };

  const inquiry = await prisma.professionalInquiry.findUnique({
    where: { id: inquiryId },
    include: {
      professional: { include: { user: true } },
      patientProfile: { include: { user: true } },
      messages: {
        include: { sender: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!inquiry) return { ok: false as const, status: 404, error: "Conversa nao encontrada." };

  const canActAsProfessional = user.professionalProfile?.id === inquiry.professionalId;
  const canActAsPatient = Boolean(
    (user.patientProfile?.id && user.patientProfile.id === inquiry.patientProfileId) ||
      (inquiry.requesterEmail && inquiry.requesterEmail.toLowerCase() === user.email.toLowerCase())
  );
  const canView = user.role === UserRole.ADMIN || canActAsProfessional || canActAsPatient;

  if (!canView) {
    return { ok: false as const, status: 403, error: "Voce nao tem permissao para ver esta conversa." };
  }

  await prisma.professionalInquiryMessage.updateMany({
    where: {
      inquiryId: inquiry.id,
      senderId: { not: user.id },
      readAt: null
    },
    data: { readAt: new Date() }
  });

  return {
    ok: true as const,
    inquiry: toProfessionalInquiryDetailsData(inquiry, {
      userId: user.id,
      accountType: user.accountType,
      canActAsProfessional,
      canActAsPatient
    })
  };
}

export async function createProfessionalInquiryMessageForUser(inquiryId: string, userId: string, body: string) {
  const trimmedBody = body.trim();

  if (trimmedBody.length < 1 || trimmedBody.length > 1000) {
    return { ok: false as const, status: 400, error: "Escreva uma mensagem de ate 1000 caracteres." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return { ok: false as const, status: 401, error: "Sessao invalida." };

  const inquiry = await prisma.professionalInquiry.findUnique({
    where: { id: inquiryId },
    include: {
      professional: { include: { user: true } },
      patientProfile: { include: { user: true } }
    }
  });

  if (!inquiry) return { ok: false as const, status: 404, error: "Conversa nao encontrada." };

  const canActAsProfessional = user.professionalProfile?.id === inquiry.professionalId;
  const canActAsPatient = Boolean(
    (user.patientProfile?.id && user.patientProfile.id === inquiry.patientProfileId) ||
      (inquiry.requesterEmail && inquiry.requesterEmail.toLowerCase() === user.email.toLowerCase())
  );
  const canMessage = user.role === UserRole.ADMIN || canActAsProfessional || canActAsPatient;

  if (!canMessage) {
    return { ok: false as const, status: 403, error: "Voce nao tem permissao para responder esta conversa." };
  }

  const recipientUser =
    canActAsProfessional || (user.role === UserRole.ADMIN && !canActAsPatient)
      ? inquiry.patientProfile?.user ||
        (inquiry.requesterEmail
          ? await prisma.user.findUnique({
              where: { email: inquiry.requesterEmail }
            })
          : null)
      : inquiry.professional.user;
  const recipientEmail =
    canActAsProfessional || (user.role === UserRole.ADMIN && !canActAsPatient)
      ? inquiry.requesterEmail || inquiry.patientProfile?.user.email || null
      : inquiry.professional.user.email;

  const message = await prisma.$transaction(async (tx) => {
    await tx.professionalInquiryMessage.updateMany({
      where: {
        inquiryId: inquiry.id,
        senderId: { not: user.id },
        readAt: null
      },
      data: { readAt: new Date() }
    });

    const createdMessage = await tx.professionalInquiryMessage.create({
      data: {
        inquiryId: inquiry.id,
        senderId: user.id,
        senderName: user.name,
        senderEmail: user.email,
        body: trimmedBody
      },
      include: { sender: true }
    });

    await tx.professionalInquiry.update({
      where: { id: inquiry.id },
      data: {
        status: canActAsProfessional ? ProfessionalInquiryStatus.RESPONDIDA : ProfessionalInquiryStatus.ABERTA
      }
    });

    return createdMessage;
  });

  if (recipientUser && recipientUser.id !== user.id) {
    try {
      await createCareNotification({
        userId: recipientUser.id,
        type: "PROFESSIONAL_INQUIRY_MESSAGE",
        title: "Nova mensagem na conversa",
        body: `${user.name} respondeu uma conversa antes do pedido.`,
        actionUrl: `/dashboard/mensagens/${inquiry.id}`
      });
    } catch (error) {
      console.error("Nao foi possivel criar notificacao interna de resposta da conversa.", error);
    }
  }

  if (recipientEmail && recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
    try {
      await sendProfessionalInquiryReplyNotification({
        to: recipientEmail,
        senderName: user.name,
        professionalName: inquiry.professional.user.name,
        inquiryId: inquiry.id,
        body: trimmedBody
      });
    } catch (error) {
      console.error("Nao foi possivel enviar e-mail de resposta da conversa.", error);
    }
  }

  return { ok: true as const, message: toProfessionalInquiryMessageData(message, user.id) };
}

export async function getCareRequestDetailsForUser(requestId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return { ok: false as const, status: 401, error: "Sessao invalida." };

  const request = await prisma.careRequest.findUnique({
    where: { id: requestId },
    include: {
      professional: {
        include: {
          user: true
        }
      },
      patientProfile: {
        include: {
          user: true
        }
      },
      review: true,
      messages: {
        include: { sender: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!request) return { ok: false as const, status: 404, error: "Atendimento nao encontrado." };

  const canActAsProfessional = user.professionalProfile?.id === request.professionalId;
  const canCancelAsPatient = Boolean(user.patientProfile?.id && user.patientProfile.id === request.patientProfileId);
  const canViewByEmail = Boolean(request.requesterEmail && request.requesterEmail.toLowerCase() === user.email.toLowerCase());
  const canView = user.role === UserRole.ADMIN || canActAsProfessional || canCancelAsPatient || canViewByEmail;
  const canReview =
    request.status === CareRequestStatus.CONCLUIDO &&
    !request.review &&
    !canActAsProfessional &&
    (canCancelAsPatient || canViewByEmail);

  if (!canView) {
    return { ok: false as const, status: 403, error: "Voce nao tem permissao para ver este atendimento." };
  }

  const viewerDeletedAt = canActAsProfessional ? request.professionalDeletedAt : request.patientDeletedAt;
  if (user.role !== UserRole.ADMIN && viewerDeletedAt) {
    return { ok: false as const, status: 404, error: "Atendimento nao encontrado no seu historico." };
  }

  await prisma.careMessage.updateMany({
    where: {
      careRequestId: request.id,
      senderId: { not: user.id },
      readAt: null
    },
    data: { readAt: new Date() }
  });

  return {
    ok: true as const,
    request: toRequestDetailsData(request, {
      userId: user.id,
      accountType: user.accountType,
      canActAsProfessional,
      canCancelAsPatient,
      canReview
    })
  };
}

export async function createCareRequestMessageForUser(requestId: string, userId: string, body: string) {
  const trimmedBody = body.trim();

  if (trimmedBody.length < 1) {
    return { ok: false as const, status: 400, error: "Escreva uma mensagem antes de enviar." };
  }

  if (trimmedBody.length > 1000) {
    return { ok: false as const, status: 400, error: "Mensagem muito longa. Use ate 1000 caracteres." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return { ok: false as const, status: 401, error: "Sessao invalida." };

  const request = await prisma.careRequest.findUnique({
    where: { id: requestId },
    include: {
      professional: {
        include: { user: true }
      },
      patientProfile: {
        include: { user: true }
      }
    }
  });

  if (!request) return { ok: false as const, status: 404, error: "Atendimento nao encontrado." };

  const canActAsProfessional = user.professionalProfile?.id === request.professionalId;
  const canActAsPatient = Boolean(user.patientProfile?.id && user.patientProfile.id === request.patientProfileId);
  const canViewByEmail = Boolean(request.requesterEmail && request.requesterEmail.toLowerCase() === user.email.toLowerCase());
  const canMessage = user.role === UserRole.ADMIN || canActAsProfessional || canActAsPatient || canViewByEmail;

  if (!canMessage) {
    return { ok: false as const, status: 403, error: "Voce nao tem permissao para enviar mensagem neste atendimento." };
  }

  const viewerDeletedAt = canActAsProfessional ? request.professionalDeletedAt : request.patientDeletedAt;
  if (user.role !== UserRole.ADMIN && viewerDeletedAt) {
    return { ok: false as const, status: 404, error: "Atendimento nao encontrado no seu historico." };
  }

  const recipientUser =
    canActAsProfessional || (user.role === UserRole.ADMIN && !canActAsPatient && !canViewByEmail)
      ? request.patientProfile?.user ||
        (request.requesterEmail
          ? await prisma.user.findUnique({
              where: { email: request.requesterEmail }
            })
          : null)
      : request.professional.user;
  const recipientEmail =
    canActAsProfessional || (user.role === UserRole.ADMIN && !canActAsPatient && !canViewByEmail)
      ? request.requesterEmail || request.patientProfile?.user.email || null
      : request.professional.user.email;

  const message = await prisma.$transaction(async (tx) => {
    await tx.careMessage.updateMany({
      where: {
        careRequestId: request.id,
        senderId: { not: user.id },
        readAt: null
      },
      data: { readAt: new Date() }
    });

    return tx.careMessage.create({
      data: {
        careRequestId: request.id,
        senderId: user.id,
        body: trimmedBody
      },
      include: { sender: true }
    });
  });

  if (recipientUser && recipientUser.id !== user.id) {
    try {
      await notifyCareMessageReceived(recipientUser.id, request.id, user.name);
    } catch (error) {
      console.error("Nao foi possivel criar notificacao interna de mensagem.", error);
    }
  }

  if (recipientEmail && recipientEmail.toLowerCase() !== user.email.toLowerCase()) {
    try {
      await sendCareMessageNotification({
        to: recipientEmail,
        senderName: user.name,
        requestId: request.id,
        serviceLabel: serviceLabel[request.service],
        body: trimmedBody
      });
    } catch (error) {
      console.error("Nao foi possivel enviar e-mail de mensagem do atendimento.", error);
    }
  }

  return { ok: true as const, message: toCareMessageData(message, user.id) };
}

export async function createCareRequestReview(requestId: string, userId: string, input: CreateCareReviewInput) {
  const rating = Math.round(input.rating);
  const comment = input.comment?.trim() || null;

  if (rating < 1 || rating > 5) {
    return { ok: false as const, status: 400, error: "Escolha uma nota de 1 a 5." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return { ok: false as const, status: 401, error: "Sessao invalida." };

  const request = await prisma.careRequest.findUnique({
    where: { id: requestId },
    include: {
      professional: {
        include: {
          user: true
        }
      },
      patientProfile: true,
      review: true
    }
  });

  if (!request) return { ok: false as const, status: 404, error: "Atendimento nao encontrado." };
  if (request.status !== CareRequestStatus.CONCLUIDO) {
    return { ok: false as const, status: 409, error: "A avaliacao fica disponivel depois que o atendimento for concluido." };
  }
  if (request.review) {
    return { ok: false as const, status: 409, error: "Este atendimento ja foi avaliado." };
  }

  const canReviewByProfile = Boolean(user.patientProfile?.id && user.patientProfile.id === request.patientProfileId);
  const canReviewByEmail = Boolean(request.requesterEmail && request.requesterEmail.toLowerCase() === user.email.toLowerCase());
  const isSameProfessional = user.professionalProfile?.id === request.professionalId;

  if (isSameProfessional || (!canReviewByProfile && !canReviewByEmail)) {
    return { ok: false as const, status: 403, error: "Somente o paciente deste atendimento pode avaliar." };
  }

  try {
    const review = await prisma.$transaction(async (tx) => {
      const createdReview = await tx.careReview.create({
        data: {
          careRequestId: request.id,
          patientProfileId: user.patientProfile?.id || request.patientProfileId || null,
          professionalId: request.professionalId,
          rating,
          comment
        }
      });

      const aggregate = await tx.careReview.aggregate({
        where: { professionalId: request.professionalId },
        _avg: { rating: true },
        _count: { _all: true }
      });

      await tx.professionalProfile.update({
        where: { id: request.professionalId },
        data: {
          rating: Number((aggregate._avg.rating || 0).toFixed(2)),
          reviewCount: aggregate._count._all
        }
      });

      return createdReview;
    });

    try {
      await notifyProfessionalReview(request.professional.userId, request.id, request.requesterName, rating);
    } catch (error) {
      console.error("Nao foi possivel criar notificacao interna de avaliacao.", error);
    }

    return {
      ok: true as const,
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString()
      }
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, status: 409, error: "Este atendimento ja foi avaliado." };
    }

    throw error;
  }
}

function toDashboardFavoriteProfessional(
  favorite: Prisma.ProfessionalFavoriteGetPayload<{
    include: {
      professional: {
        include: {
          user: true;
          documents: true;
          availability: true;
        };
      };
    };
  }>
): DashboardFavoriteProfessional {
  const professional = favorite.professional;
  const priceLabel = "Sob consulta";

  return {
    id: professional.id,
    name: professional.user.name,
    professionalType: professional.professionalType as DashboardFavoriteProfessional["professionalType"],
    roleLabel: professionalTypeLabel[professional.professionalType],
    gender: professional.gender as DashboardFavoriteProfessional["gender"],
    neighborhood: professional.neighborhood,
    city: professional.city,
    priceLabel,
    availableIn: professional.availability.length > 0 ? "Agenda flexivel" : "Sob consulta",
    supportLevel: professional.supportLevel as DashboardFavoriteProfessional["supportLevel"],
    supportLevelLabel: supportLabel[professional.supportLevel],
    serviceCodes: professional.services as DashboardFavoriteProfessional["serviceCodes"],
    services: professional.services.map((service) => serviceLabel[service]),
    credentials: professional.documents.filter((document) => document.status === VerificationStatus.VERIFICADO).map((document) => document.label),
    rating: Number(professional.rating),
    reviewCount: professional.reviewCount,
    isVerified: professional.isVerified,
    createdAt: favorite.createdAt.toISOString()
  };
}

export async function updateCareRequestStatus(requestId: string, userId: string, nextStatus: CareRequestStatus) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return { ok: false as const, status: 401, error: "Sessao invalida." };

  const request = await prisma.careRequest.findUnique({
    where: { id: requestId },
    include: {
      professional: true,
      patientProfile: true
    }
  });

  if (!request) return { ok: false as const, status: 404, error: "Solicitacao nao encontrada." };

  const isAssignedProfessional = user.professionalProfile?.id === request.professionalId;
  const isRequestPatient = Boolean(user.patientProfile?.id && user.patientProfile.id === request.patientProfileId);

  if (!isAssignedProfessional && !(isRequestPatient && nextStatus === CareRequestStatus.CANCELADO)) {
    return { ok: false as const, status: 403, error: "Voce nao tem permissao para alterar esta solicitacao." };
  }

  const professionalAllowed: Record<CareRequestStatus, CareRequestStatus[]> = {
    RASCUNHO: [],
    ENVIADO: [CareRequestStatus.ACEITO, CareRequestStatus.AGENDADO, CareRequestStatus.CANCELADO],
    ACEITO: [CareRequestStatus.AGENDADO, CareRequestStatus.CANCELADO],
    AGENDADO: [CareRequestStatus.CONCLUIDO, CareRequestStatus.CANCELADO],
    CONCLUIDO: [],
    CANCELADO: []
  };
  const patientAllowed: Record<CareRequestStatus, CareRequestStatus[]> = {
    RASCUNHO: [CareRequestStatus.CANCELADO],
    ENVIADO: [CareRequestStatus.CANCELADO],
    ACEITO: [CareRequestStatus.CANCELADO],
    AGENDADO: [CareRequestStatus.CANCELADO],
    CONCLUIDO: [],
    CANCELADO: []
  };
  const allowed = isAssignedProfessional ? professionalAllowed[request.status] : patientAllowed[request.status];

  if (!allowed.includes(nextStatus)) {
    return { ok: false as const, status: 400, error: "Mudanca de status nao permitida para esta solicitacao." };
  }

  const updateData: Prisma.CareRequestUpdateInput = { status: nextStatus };

  if (nextStatus === CareRequestStatus.AGENDADO && request.scheduledFor) {
    const schedule = scheduleTimestamps(request.scheduledFor, request.durationHours);
    updateData.scheduledEndAt = schedule.scheduledEndAt;
    updateData.completionAvailableAt = schedule.completionAvailableAt;
  }

  if (nextStatus === CareRequestStatus.CONCLUIDO) {
    const availableAt = requestCompletionAvailableAt(request);

    if (!request.scheduledFor || !availableAt) {
      return {
        ok: false as const,
        status: 409,
        error: "Defina data e horario do atendimento antes de marcar como concluido."
      };
    }

    if (Date.now() < availableAt.getTime()) {
      return {
        ok: false as const,
        status: 409,
        error: `Concluir fica liberado a partir de ${formatBrasiliaDateTime(availableAt)}.`
      };
    }

    const schedule = scheduleTimestamps(request.scheduledFor, request.durationHours);
    updateData.scheduledEndAt = request.scheduledEndAt || schedule.scheduledEndAt;
    updateData.completionAvailableAt = request.completionAvailableAt || schedule.completionAvailableAt;
    updateData.completedAt = new Date();
    updateData.completedById = user.id;
  }

  const updatedRequest = await prisma.careRequest.update({
    where: { id: requestId },
    data: updateData,
    include: {
      professional: {
        include: { user: true }
      },
      patientProfile: true
    }
  });

  try {
    if (isRequestPatient && nextStatus === CareRequestStatus.CANCELADO) {
      await notifyCareRequestCanceledForProfessional(updatedRequest);
    } else {
      await notifyCareRequestStatusForPatient(updatedRequest);
    }
  } catch (error) {
    console.error("Nao foi possivel criar notificacao interna de status do atendimento.", error);
  }

  try {
    await sendCareRequestStatusNotification(updatedRequest);
  } catch (error) {
    console.error("Nao foi possivel enviar notificacao de status do atendimento.", error);
  }

  return { ok: true as const, request: toRequestRecord(updatedRequest) };
}

export async function archiveCareRequestForUser(requestId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return { ok: false as const, status: 401, error: "Sessao invalida." };

  const request = await prisma.careRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) return { ok: false as const, status: 404, error: "Solicitacao nao encontrada." };

  const isAssignedProfessional = user.professionalProfile?.id === request.professionalId;
  const isRequestPatient = Boolean(user.patientProfile?.id && user.patientProfile.id === request.patientProfileId);

  if (!isAssignedProfessional && !isRequestPatient) {
    return { ok: false as const, status: 403, error: "Voce nao tem permissao para arquivar esta solicitacao." };
  }

  if (request.status !== CareRequestStatus.CONCLUIDO && request.status !== CareRequestStatus.CANCELADO) {
    return { ok: false as const, status: 400, error: "Arquive apenas atendimentos concluidos ou cancelados." };
  }

  await prisma.careRequest.update({
    where: { id: requestId },
    data: isAssignedProfessional ? { professionalArchivedAt: new Date() } : { patientArchivedAt: new Date() }
  });

  return { ok: true as const };
}

export async function restoreCareRequestForUser(requestId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return { ok: false as const, status: 401, error: "Sessao invalida." };

  const request = await prisma.careRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) return { ok: false as const, status: 404, error: "Solicitacao nao encontrada." };

  const isAssignedProfessional = user.professionalProfile?.id === request.professionalId;
  const isRequestPatient = Boolean(user.patientProfile?.id && user.patientProfile.id === request.patientProfileId);

  if (!isAssignedProfessional && !isRequestPatient) {
    return { ok: false as const, status: 403, error: "Voce nao tem permissao para restaurar esta solicitacao." };
  }

  await prisma.careRequest.update({
    where: { id: requestId },
    data: isAssignedProfessional ? { professionalArchivedAt: null } : { patientArchivedAt: null }
  });

  return { ok: true as const };
}

export async function deleteCareRequestFromHistoryForUser(requestId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return { ok: false as const, status: 401, error: "Sessao invalida." };

  const request = await prisma.careRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) return { ok: false as const, status: 404, error: "Solicitacao nao encontrada." };

  const isAssignedProfessional = user.professionalProfile?.id === request.professionalId;
  const isRequestPatient = Boolean(user.patientProfile?.id && user.patientProfile.id === request.patientProfileId);

  if (!isAssignedProfessional && !isRequestPatient) {
    return { ok: false as const, status: 403, error: "Voce nao tem permissao para excluir esta solicitacao." };
  }

  const archivedAt = isAssignedProfessional ? request.professionalArchivedAt : request.patientArchivedAt;
  if (!archivedAt) {
    return { ok: false as const, status: 400, error: "Arquive o atendimento antes de excluir do historico." };
  }

  await prisma.careRequest.update({
    where: { id: requestId },
    data: isAssignedProfessional ? { professionalDeletedAt: new Date() } : { patientDeletedAt: new Date() }
  });

  return { ok: true as const };
}

export async function updateProfessionalProfileForUser(userId: string, input: UpdateProfessionalProfileInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { professionalProfile: true }
  });

  if (!user?.professionalProfile) {
    return { ok: false as const, status: 403, error: "Perfil profissional nao encontrado." };
  }

  const coordinates = coordinatesFor(input.neighborhood);
  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.professionalProfile.update({
      where: { id: user.professionalProfile.id },
      data: {
        phone: input.phone || null,
        neighborhood: input.neighborhood,
        addressLine: input.addressLine || null,
        addressNumber: input.addressNumber || null,
        addressComplement: input.addressComplement || null,
        postalCode: input.postalCode || null,
        city: input.city || defaultCenter.city,
        state: input.state || null,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        serviceRadiusKm: input.serviceRadiusKm,
        hourlyRate: input.hourlyRate,
        sessionRate: input.sessionRate,
        bio: input.bio,
        mobilitySupport: input.mobilitySupport,
        supportLevel: input.supportLevel,
        acceptsTravel: input.acceptsTravel,
        hasPassport: input.acceptsTravel ? input.hasPassport : false,
        hasUsVisa: input.acceptsTravel ? input.hasUsVisa : false,
        travelNotes: input.acceptsTravel ? input.travelNotes || null : null,
        services: input.services
      }
    }),
    prisma.availabilitySlot.deleteMany({
      where: { professionalId: user.professionalProfile.id }
    })
  ];

  if (input.availability.length > 0) {
    operations.push(prisma.availabilitySlot.createMany({
      data: input.availability.map((slot) => ({
        professionalId: user.professionalProfile!.id,
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime
      }))
    }));
  }

  await prisma.$transaction(operations);

  return { ok: true as const };
}

export async function createProfessionalDocumentForUser(userId: string, input: CreateProfessionalDocumentInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { professionalProfile: true }
  });

  if (!user?.professionalProfile) {
    return { ok: false as const, status: 403, error: "Perfil profissional nao encontrado." };
  }

  const externalCheck =
    (input.type === DocumentType.COREN || input.type === DocumentType.CREFITO) && input.documentNumber && input.registrationUf
      ? await verifyProfessionalRegistration({
          council: input.type,
          registrationNumber: input.documentNumber,
          uf: input.registrationUf,
          cpf: input.cpf
        })
      : null;

  const document = await prisma.$transaction(async (tx) => {
    const createdDocument = await tx.professionalDocument.create({
      data: {
        professionalId: user.professionalProfile!.id,
        type: input.type,
        label: input.label?.trim() || documentTypeLabel[input.type],
        documentNumber: input.documentNumber?.trim() || null,
        storagePath: input.storagePath,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        consentAccepted: input.consentAccepted,
        consentAcceptedAt: input.consentAccepted ? new Date() : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        status: VerificationStatus.PENDENTE,
        externalCheckStatus: externalCheck?.status || null,
        externalCheckSource: externalCheck?.source || null,
        externalCheckMessage: externalCheck?.message || null,
        externalCheckCheckedAt: externalCheck ? new Date() : null
      }
    });

    await tx.professionalProfile.update({
      where: { id: user.professionalProfile!.id },
      data: {
        cpf: input.cpf || undefined,
        professionalRegistrationNumber:
          input.type === DocumentType.COREN || input.type === DocumentType.CREFITO ? input.documentNumber || undefined : undefined,
        professionalRegistrationUf:
          input.type === DocumentType.COREN || input.type === DocumentType.CREFITO ? input.registrationUf?.toUpperCase() || undefined : undefined,
        verificationStatus: ProfessionalVerificationStatus.EM_ANALISE
      }
    });

    return createdDocument;
  });

  await refreshProfessionalVerification(user.professionalProfile.id);

  return { ok: true as const, document: toProfessionalDocumentData(document) };
}

export async function updateProfessionalDocumentType(adminUserId: string, documentId: string, type: DocumentType, reviewNote?: string) {
  const existingDocument = await prisma.professionalDocument.findUnique({
    where: { id: documentId },
    include: { professional: true }
  });

  if (!existingDocument) {
    throw new Error("Documento nao encontrado.");
  }

  const documentNumberLooksLikeCpf = Boolean(
    existingDocument.documentNumber &&
      existingDocument.professional.cpf &&
      existingDocument.documentNumber.replace(/\D/g, "") === existingDocument.professional.cpf.replace(/\D/g, "")
  );

  const document = await prisma.$transaction(async (tx) => {
    const updatedDocument = await tx.professionalDocument.update({
      where: { id: documentId },
      data: {
        type,
        label: documentTypeLabel[type],
        documentNumber: type === DocumentType.CPF || !documentNumberLooksLikeCpf ? existingDocument.documentNumber : null,
        reviewNote: reviewNote?.trim() || existingDocument.reviewNote
      }
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId,
        targetProfessionalId: updatedDocument.professionalId,
        documentId,
        action: "DOCUMENT_TYPE_UPDATE",
        previousStatus: existingDocument.type,
        nextStatus: type,
        note: reviewNote?.trim() || null
      }
    });

    return updatedDocument;
  });

  await refreshProfessionalVerification(document.professionalId);

  return toProfessionalDocumentData(document);
}

export async function reviewProfessionalDocument(adminUserId: string, documentId: string, status: VerificationStatus, reviewNote?: string) {
  const existingDocument = await prisma.professionalDocument.findUnique({
    where: { id: documentId },
    include: { professional: true }
  });

  if (!existingDocument) {
    throw new Error("Documento nao encontrado.");
  }

  const document = await prisma.$transaction(async (tx) => {
    const updatedDocument = await tx.professionalDocument.update({
      where: { id: documentId },
      data: {
        status,
        reviewNote: reviewNote?.trim() || null,
        reviewedAt: new Date()
      }
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId,
        targetProfessionalId: updatedDocument.professionalId,
        documentId,
        action: "DOCUMENT_REVIEW",
        previousStatus: existingDocument.status,
        nextStatus: status,
        note: reviewNote?.trim() || null
      }
    });

    return updatedDocument;
  });

  await refreshProfessionalVerification(document.professionalId);

  if (existingDocument.status !== status) {
    try {
      await notifyProfessionalDocumentReview(existingDocument.professional.userId, document.label, status);
    } catch (error) {
      console.error("Nao foi possivel criar notificacao interna de documento.", error);
    }
  }

  return toProfessionalDocumentData(document);
}

export async function reviewProfessionalRegistration(adminUserId: string, professionalId: string, status: ProfessionalVerificationStatus, note?: string) {
  const existingProfessional = await prisma.professionalProfile.findUnique({
    where: { id: professionalId }
  });

  if (!existingProfessional) {
    throw new Error("Profissional nao encontrado.");
  }

  const professional = await prisma.$transaction(async (tx) => {
    const updatedProfessional = await tx.professionalProfile.update({
      where: { id: professionalId },
      data: {
        verificationStatus: status,
        verificationNote: note?.trim() || null,
        verificationReviewedAt: new Date()
      }
    });

    await tx.adminAuditLog.create({
      data: {
        adminUserId,
        targetProfessionalId: professionalId,
        action: "PROFESSIONAL_VERIFICATION_REVIEW",
        previousStatus: existingProfessional.verificationStatus,
        nextStatus: status,
        note: note?.trim() || null
      }
    });

    return updatedProfessional;
  });

  await refreshProfessionalVerification(professional.id);

  if (existingProfessional.verificationStatus !== status) {
    try {
      await notifyProfessionalVerificationReview(professional.userId, status);
    } catch (error) {
      console.error("Nao foi possivel criar notificacao interna de cadastro profissional.", error);
    }
  }

  return {
    id: professional.id,
    verificationStatus: professional.verificationStatus,
    verificationStatusLabel: professionalVerificationStatusLabel[professional.verificationStatus]
  };
}

export async function getCareRequestsForUser(userId: string) {
  const collections = await getCareRequestCollectionsForUser(userId);
  return [...collections.activeRequests, ...collections.recentRequests];
}

export async function getCareRequestCollectionsForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) {
    return {
      activeRequests: [],
      recentRequests: [],
      archivedRequests: []
    };
  }

  const isProfessional = user.accountType === AccountType.PROFESSIONAL && user.professionalProfile;
  const ownerWhere = isProfessional ? { professionalId: user.professionalProfile!.id } : { patientProfileId: user.patientProfile?.id || "" };
  const archiveField = isProfessional ? "professionalArchivedAt" : "patientArchivedAt";
  const deletedField = isProfessional ? "professionalDeletedAt" : "patientDeletedAt";
  const includeProfessional = {
    professional: {
      include: { user: true }
    }
  };

  const [activeRequests, recentRequests, archivedRequests] = await Promise.all([
    prisma.careRequest.findMany({
      where: {
        ...ownerWhere,
        [archiveField]: null,
        [deletedField]: null,
        status: { in: [CareRequestStatus.ENVIADO, CareRequestStatus.ACEITO, CareRequestStatus.AGENDADO] }
      },
      include: includeProfessional,
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
      take: 30
    }),
    prisma.careRequest.findMany({
      where: {
        ...ownerWhere,
        [archiveField]: null,
        [deletedField]: null,
        status: { in: [CareRequestStatus.CONCLUIDO, CareRequestStatus.CANCELADO] }
      },
      include: includeProfessional,
      orderBy: { createdAt: "desc" },
      take: 500
    }),
    prisma.careRequest.findMany({
      where: {
        ...ownerWhere,
        [archiveField]: { not: null },
        [deletedField]: null
      },
      include: includeProfessional,
      orderBy: [{ [archiveField]: "desc" }, { createdAt: "desc" }],
      take: 500
    })
  ]);

  return {
    activeRequests: activeRequests.map((request) =>
      toRequestRecord(
        request,
        isProfessional ? request.professionalArchivedAt : request.patientArchivedAt,
        isProfessional ? request.professionalDeletedAt : request.patientDeletedAt
      )
    ),
    recentRequests: recentRequests.map((request) =>
      toRequestRecord(
        request,
        isProfessional ? request.professionalArchivedAt : request.patientArchivedAt,
        isProfessional ? request.professionalDeletedAt : request.patientDeletedAt
      )
    ),
    archivedRequests: archivedRequests.map((request) =>
      toRequestRecord(
        request,
        isProfessional ? request.professionalArchivedAt : request.patientArchivedAt,
        isProfessional ? request.professionalDeletedAt : request.patientDeletedAt
      )
    )
  };
}

export async function getCareDashboardData(userId: string): Promise<CareDashboardData> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalFavorites: {
        include: {
          professional: {
            include: {
              user: true,
              documents: { orderBy: { createdAt: "desc" } },
              availability: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 12
      },
      professionalProfile: {
        include: {
          documents: true,
          availability: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }
        }
      }
    }
  });

  const requestCollections = await getCareRequestCollectionsForUser(userId);
  const requests = requestCollections.activeRequests;
  const dashboardRequests = [...requestCollections.activeRequests, ...requestCollections.recentRequests, ...requestCollections.archivedRequests];
  const [notifications, unreadNotifications, inquiries] = await Promise.all([
    getCareNotificationsForUser(userId),
    getUnreadCareNotificationCount(userId),
    getProfessionalInquiriesForUser(userId)
  ]);
  const scheduled = dashboardRequests.filter((request) => ["ACEITO", "AGENDADO"].includes(request.status) && !request.archivedAt).length;
  const completed = dashboardRequests.filter((request) => request.status === "CONCLUIDO").length;

  return {
    summary: {
      accountType: user.accountType,
      accountTypeLabel: user.accountType === AccountType.PROFESSIONAL ? "Profissional" : "Paciente",
      requests: requests.length,
      scheduled,
      completed,
      verifiedDocuments: user.professionalProfile?.documents.filter((document) => document.status === "VERIFICADO").length ?? 0,
      favoriteProfessionals: user.professionalFavorites.length,
      unreadNotifications
    },
    requests,
    recentRequests: requestCollections.recentRequests,
    archivedRequests: requestCollections.archivedRequests,
    notifications,
    inquiries,
    favoriteProfessionals: user.professionalFavorites.map(toDashboardFavoriteProfessional),
    professionalSettings: user.professionalProfile
      ? {
          professionalType: user.professionalProfile.professionalType,
          gender: user.professionalProfile.gender,
          age: user.professionalProfile.age,
          phone: user.professionalProfile.phone,
          cpf: user.professionalProfile.cpf,
          professionalRegistrationNumber: user.professionalProfile.professionalRegistrationNumber,
          professionalRegistrationUf: user.professionalProfile.professionalRegistrationUf,
          verificationStatus: user.professionalProfile.verificationStatus,
          verificationStatusLabel: professionalVerificationStatusLabel[user.professionalProfile.verificationStatus],
          verificationNote: user.professionalProfile.verificationNote,
          neighborhood: user.professionalProfile.neighborhood,
          addressLine: user.professionalProfile.addressLine,
          addressNumber: user.professionalProfile.addressNumber,
          addressComplement: user.professionalProfile.addressComplement,
          postalCode: user.professionalProfile.postalCode,
          city: user.professionalProfile.city,
          state: user.professionalProfile.state,
          serviceRadiusKm: user.professionalProfile.serviceRadiusKm,
          hourlyRate: Number(user.professionalProfile.hourlyRate),
          sessionRate: user.professionalProfile.sessionRate ? Number(user.professionalProfile.sessionRate) : null,
          bio: user.professionalProfile.bio,
          mobilitySupport: user.professionalProfile.mobilitySupport,
          supportLevel: user.professionalProfile.supportLevel,
          acceptsTravel: user.professionalProfile.acceptsTravel,
          hasPassport: user.professionalProfile.hasPassport,
          hasUsVisa: user.professionalProfile.hasUsVisa,
          travelNotes: user.professionalProfile.travelNotes,
          services: user.professionalProfile.services,
          availability: user.professionalProfile.availability.map((slot) => ({
            weekday: slot.weekday,
            startTime: slot.startTime,
            endTime: slot.endTime
          })),
          documents: user.professionalProfile.documents
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map(toProfessionalDocumentData),
          requiredDocuments: requiredDocumentStatus(user.professionalProfile.professionalType, user.professionalProfile.documents)
        }
      : null,
    profile: {
      name: user.name,
      email: user.email,
      photoUrl: user.patientProfile?.photoUrl || user.professionalProfile?.photoUrl || null,
      neighborhood: user.patientProfile?.neighborhood || user.professionalProfile?.neighborhood || null,
      transferNeedLabel: user.patientProfile ? supportLabel[user.patientProfile.transferNeed] : null,
      professionalTypeLabel: user.professionalProfile ? professionalTypeLabel[user.professionalProfile.professionalType] : null
    }
  };
}

export async function getCareAdminOverview(): Promise<CareAdminOverview> {
  const staleRequestThreshold = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const [
    users,
    patients,
    professionals,
    verifiedProfessionals,
    openRequests,
    completedRequests,
    pendingDocuments,
    unansweredRequests,
    staleUnansweredRequests,
    unverifiedActiveProfessionals,
    professionalsWithoutAvailability,
    activeProfessionalsMissingPhoto,
    professionalsByType,
    requestsByStatus,
    professionalDirectory,
    documentsForReview,
    recentCareRequests,
    auditLogs,
    healthChecks
  ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { accountType: AccountType.PATIENT } }),
      prisma.professionalProfile.count(),
      prisma.professionalProfile.count({ where: { isVerified: true } }),
      prisma.careRequest.count({ where: { status: { in: [CareRequestStatus.ENVIADO, CareRequestStatus.ACEITO, CareRequestStatus.AGENDADO] } } }),
      prisma.careRequest.count({ where: { status: CareRequestStatus.CONCLUIDO } }),
      prisma.professionalDocument.count({ where: { status: VerificationStatus.PENDENTE } }),
      prisma.careRequest.count({ where: { status: CareRequestStatus.ENVIADO } }),
      prisma.careRequest.count({ where: { status: CareRequestStatus.ENVIADO, createdAt: { lte: staleRequestThreshold } } }),
      prisma.professionalProfile.count({ where: { isActive: true, isVerified: false } }),
      prisma.professionalProfile.count({ where: { isActive: true, availability: { none: {} } } }),
      prisma.professionalProfile.count({ where: { isActive: true, photoUrl: null } }),
      prisma.professionalProfile.groupBy({
        by: ["professionalType"],
        _count: { _all: true }
      }),
      prisma.careRequest.groupBy({
        by: ["status"],
        _count: { _all: true }
      }),
      prisma.professionalProfile.findMany({
        include: {
          user: true,
          availability: { select: { id: true } },
          documents: { select: { type: true, status: true } }
        },
        orderBy: [{ isVerified: "asc" }, { updatedAt: "desc" }],
        take: 50
      }),
      prisma.professionalDocument.findMany({
        include: {
          professional: {
            include: { user: true }
          }
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 30
      }),
      prisma.careRequest.findMany({
        include: {
          professional: {
            include: { user: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      getAppHealthChecks()
    ]);

  return {
    users,
    patients,
    professionals,
    verifiedProfessionals,
    openRequests,
    completedRequests,
    pendingDocuments,
    professionalsByType: professionalsByType.map((item) => ({
      label: professionalTypeLabel[item.professionalType],
      count: item._count._all
    })),
    requestsByStatus: requestsByStatus.map((item) => ({
      label: statusLabel[item.status],
      count: item._count._all
    })),
    readinessChecks: toReadinessChecks(healthChecks),
    operationalAlerts: toOperationalAlerts({
      unansweredRequests,
      staleUnansweredRequests,
      pendingDocuments,
      unverifiedActiveProfessionals,
      professionalsWithoutAvailability,
      activeProfessionalsMissingPhoto,
      emailNotifications: healthChecks.emailNotifications
    }),
    professionalDirectory: professionalDirectory.map((professional) => {
      const pendingDocumentCount = professional.documents.filter((document) => document.status === VerificationStatus.PENDENTE).length;
      const verifiedDocumentCount = professional.documents.filter((document) => document.status === VerificationStatus.VERIFICADO).length;
      const missingRequiredDocuments = requiredDocumentStatus(professional.professionalType, professional.documents)
        .filter((document) => document.status !== "VERIFICADO")
        .map((document) => document.label);
      const issues = [
        professional.isVerified ? null : "Sem selo",
        professional.availability.length > 0 ? null : "Sem agenda",
        professional.photoUrl ? null : "Sem foto",
        pendingDocumentCount > 0 ? `${pendingDocumentCount} doc pendente(s)` : null,
        missingRequiredDocuments.length > 0 ? `${missingRequiredDocuments.length} doc obrigatorio(s)` : null,
        professional.services.length > 0 ? null : "Sem servicos"
      ].filter(Boolean) as string[];

      return {
        id: professional.id,
        name: professional.user.name,
        email: professional.user.email,
        phone: professional.phone,
        professionalTypeLabel: professionalTypeLabel[professional.professionalType],
        verificationStatusLabel: professionalVerificationStatusLabel[professional.verificationStatus],
        isVerified: professional.isVerified,
        isActive: professional.isActive,
        hasPhoto: Boolean(professional.photoUrl),
        availabilityCount: professional.availability.length,
        pendingDocuments: pendingDocumentCount,
        verifiedDocuments: verifiedDocumentCount,
        missingRequiredDocuments,
        servicesCount: professional.services.length,
        neighborhood: professional.neighborhood,
        city: professional.city,
        updatedAt: professional.updatedAt.toISOString(),
        issues
      };
    }),
    recentCareRequests: recentCareRequests.map((request) => ({
      id: request.id,
      status: request.status,
      statusLabel: statusLabel[request.status],
      serviceLabel: serviceLabel[request.service],
      scheduledFor: request.scheduledFor ? request.scheduledFor.toISOString() : null,
      createdAt: request.createdAt.toISOString(),
      requesterName: request.requesterName,
      requesterEmail: request.requesterEmail,
      requesterPhone: request.requesterPhone,
      professionalName: request.professional.user.name,
      professionalRole: professionalTypeLabel[request.professional.professionalType],
      neighborhood: request.neighborhood,
      city: request.city
    })),
    documentsForReview: documentsForReview.map((document): AdminDocumentReviewData => ({
      ...toProfessionalDocumentData(document),
      professionalId: document.professional.id,
      professionalName: document.professional.user.name,
      professionalEmail: document.professional.user.email,
      professionalTypeLabel: professionalTypeLabel[document.professional.professionalType],
      professionalVerificationStatus: document.professional.verificationStatus,
      professionalVerificationStatusLabel: professionalVerificationStatusLabel[document.professional.verificationStatus],
      professionalRegistrationUf: document.professional.professionalRegistrationUf,
      professionalCpfMasked: maskCpf(document.professional.cpf) || null
    })),
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      adminUserId: log.adminUserId,
      action: log.action,
      nextStatus: log.nextStatus,
      note: log.note,
      createdAt: log.createdAt.toISOString()
    }))
  };
}
