import {
  AccountType,
  CareRequestStatus,
  CareService,
  DocumentType,
  Gender,
  GenderPreference,
  Prisma,
  ProfessionalType,
  ProfessionalVerificationStatus,
  TransferSupportLevel,
  VerificationStatus
} from "@prisma/client";
import { maskCpf } from "@/lib/cpf";
import { sendCareRequestStatusNotification, sendNewCareRequestNotifications } from "@/lib/care-notifications";
import {
  getCareNotificationsForUser,
  getUnreadCareNotificationCount,
  notifyCareRequestCanceledForProfessional,
  notifyCareRequestStatusForPatient,
  notifyNewCareRequest,
  notifyProfessionalDocumentReview,
  notifyProfessionalVerificationReview
} from "@/lib/care-in-app-notifications";
import { parseBrasiliaDateTime } from "@/lib/date-time";
import { prisma } from "@/lib/prisma";
import { verifyProfessionalRegistration } from "@/lib/professional-registration-verifier";
import { formatMoney } from "@/lib/utils";
import {
  AvailabilityFilter,
  AvailabilitySlotData,
  AdminDocumentReviewData,
  CareAdminOverview,
  CareDashboardData,
  CareProfessional,
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
  FORTALECIMENTO: "Fortalecimento"
};

const genderLabel: Record<Gender, string> = {
  FEMININO: "Feminino",
  MASCULINO: "Masculino",
  OUTRO: "Outro"
};

const supportLabel: Record<TransferSupportLevel, string> = {
  MODERADO: "Apoio moderado",
  ALTO: "Apoio fisico alto",
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

export type CareSearchParams = {
  service: CareService;
  professionalType?: ProfessionalType;
  genderPreference: GenderPreference;
  supportNeed: TransferSupportLevel;
  availability: AvailabilityFilter;
  radiusKm: number;
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
};

type ProfessionalWithRelations = Prisma.ProfessionalProfileGetPayload<{
  include: {
    user: true;
    documents: true;
    availability: true;
  };
}>;

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
    : GenderPreference.FEMININO;
}

export function parseSupportLevel(value: string | null): TransferSupportLevel {
  return Object.values(TransferSupportLevel).includes(value as TransferSupportLevel)
    ? (value as TransferSupportLevel)
    : TransferSupportLevel.ALTO;
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

function slotMatchesAvailability(slot: { weekday: number; startTime: string; endTime: string }, filter: AvailabilityFilter) {
  if (filter === "qualquer") return true;

  const now = new Date();
  const weekday = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(slot.startTime);
  const end = timeToMinutes(slot.endTime);

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
  if (professional.services.includes(params.service)) score += 18;
  if (params.genderPreference === GenderPreference.QUALQUER || professional.gender === params.genderPreference) score += 10;
  if (canSupport(professional.supportLevel, params.supportNeed)) score += 12;
  if (hasAvailability) score += 8;
  if (professional.isVerified) score += 4;
  score += Math.max(0, 10 - distance);
  score += Number(professional.rating) - 4.5;
  return Math.round(Math.min(score, 99));
}

function toCareProfessional(professional: ProfessionalWithRelations, params: CareSearchParams, distance: number): CareProfessional {
  const hasAvailability = professional.availability.some((slot) => slotMatchesAvailability(slot, params.availability));
  const verifiedDocs = professional.documents.filter((document) => document.status === "VERIFICADO");
  const price = professional.sessionRate ? `${formatMoney(Number(professional.sessionRate))}/sessao` : `${formatMoney(Number(professional.hourlyRate))}/h`;

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
    services: professional.services,
    serviceLabels: professional.services.map((service) => serviceLabel[service]),
    credentials: verifiedDocs.map((document) => document.label),
    bio: professional.bio,
    isVerified: professional.isVerified,
    matchScore: calculateScore(professional, distance, params, hasAvailability)
  };
}

export async function searchCareProfessionals(params: CareSearchParams) {
  const latitude = params.latitude ?? defaultCenter.latitude;
  const longitude = params.longitude ?? defaultCenter.longitude;

  const candidates = await prisma.professionalProfile.findMany({
    where: {
      isActive: true,
      services: { has: params.service },
      professionalType: params.professionalType,
      gender:
        params.genderPreference === GenderPreference.QUALQUER
          ? undefined
          : params.genderPreference === GenderPreference.FEMININO
            ? Gender.FEMININO
            : Gender.MASCULINO
    },
    include: {
      user: true,
      documents: { orderBy: { createdAt: "asc" } },
      availability: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }
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
      scheduledFor: input.scheduledFor ? parseBrasiliaDateTime(input.scheduledFor) : null,
      durationHours: input.durationHours ?? 2,
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

  return request;
}

function toRequestRecord(request: Prisma.CareRequestGetPayload<{ include: { professional: { include: { user: true } } } }>): CareRequestRecord {
  return {
    id: request.id,
    status: request.status,
    statusLabel: statusLabel[request.status],
    serviceLabel: serviceLabel[request.service],
    scheduledFor: request.scheduledFor ? request.scheduledFor.toISOString() : null,
    createdAt: request.createdAt.toISOString(),
    requesterName: request.requesterName,
    requesterPhone: request.requesterPhone,
    addressLine: request.addressLine,
    addressNumber: request.addressNumber,
    addressComplement: request.addressComplement,
    postalCode: request.postalCode,
    city: request.city,
    state: request.state,
    notes: request.notes,
    professionalName: request.professional.user.name,
    professionalRole: professionalTypeLabel[request.professional.professionalType],
    neighborhood: request.neighborhood
  };
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
  const priceLabel = professional.sessionRate
    ? `${formatMoney(Number(professional.sessionRate))}/sessao`
    : `${formatMoney(Number(professional.hourlyRate))}/h`;

  return {
    id: professional.id,
    name: professional.user.name,
    roleLabel: professionalTypeLabel[professional.professionalType],
    neighborhood: professional.neighborhood,
    city: professional.city,
    priceLabel,
    availableIn: professional.availability.length > 0 ? "Agenda flexivel" : "Sob consulta",
    supportLevelLabel: supportLabel[professional.supportLevel],
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

  const updatedRequest = await prisma.careRequest.update({
    where: { id: requestId },
    data: { status: nextStatus },
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) return [];

  const requests = await prisma.careRequest.findMany({
    where:
      user.accountType === AccountType.PROFESSIONAL && user.professionalProfile
        ? { professionalId: user.professionalProfile.id }
        : { patientProfileId: user.patientProfile?.id || "" },
    include: {
      professional: {
        include: { user: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return requests.map(toRequestRecord);
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

  const requests = await getCareRequestsForUser(userId);
  const [notifications, unreadNotifications] = await Promise.all([
    getCareNotificationsForUser(userId),
    getUnreadCareNotificationCount(userId)
  ]);
  const scheduled = requests.filter((request) => ["ACEITO", "AGENDADO"].includes(request.status)).length;
  const completed = requests.filter((request) => request.status === "CONCLUIDO").length;

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
    notifications,
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
      neighborhood: user.patientProfile?.neighborhood || user.professionalProfile?.neighborhood || null,
      transferNeedLabel: user.patientProfile ? supportLabel[user.patientProfile.transferNeed] : null,
      professionalTypeLabel: user.professionalProfile ? professionalTypeLabel[user.professionalProfile.professionalType] : null
    }
  };
}

export async function getCareAdminOverview(): Promise<CareAdminOverview> {
  const [
    users,
    patients,
    professionals,
    verifiedProfessionals,
    openRequests,
    completedRequests,
    pendingDocuments,
    professionalsByType,
    requestsByStatus,
    documentsForReview,
    auditLogs
  ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { accountType: AccountType.PATIENT } }),
      prisma.professionalProfile.count(),
      prisma.professionalProfile.count({ where: { isVerified: true } }),
      prisma.careRequest.count({ where: { status: { in: [CareRequestStatus.ENVIADO, CareRequestStatus.ACEITO, CareRequestStatus.AGENDADO] } } }),
      prisma.careRequest.count({ where: { status: CareRequestStatus.CONCLUIDO } }),
      prisma.professionalDocument.count({ where: { status: VerificationStatus.PENDENTE } }),
      prisma.professionalProfile.groupBy({
        by: ["professionalType"],
        _count: { _all: true }
      }),
      prisma.careRequest.groupBy({
        by: ["status"],
        _count: { _all: true }
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
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20
      })
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
