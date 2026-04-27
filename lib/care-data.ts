import {
  AccountType,
  CareRequestStatus,
  CareService,
  Gender,
  GenderPreference,
  Prisma,
  ProfessionalType,
  TransferSupportLevel
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";
import { AvailabilityFilter, CareAdminOverview, CareDashboardData, CareProfessional, CareRequestRecord } from "@/types";

const defaultCenter = {
  city: "Porto Alegre",
  neighborhood: "Zona Sul",
  latitude: -30.111947,
  longitude: -51.256708
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
  neighborhood: string;
  city?: string;
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
      return distance <= params.radiusKm && canSupport(professional.supportLevel, params.supportNeed) && hasAvailability;
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

  return prisma.careRequest.create({
    data: {
      patientProfileId,
      professionalId: input.professionalId,
      requesterName,
      requesterEmail,
      requesterPhone: input.requesterPhone,
      service: input.service,
      supportNeed: input.supportNeed,
      preferredGender: input.preferredGender,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      durationHours: input.durationHours ?? 2,
      addressLine: input.addressLine,
      neighborhood: input.neighborhood,
      city: input.city || defaultCenter.city,
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
    city: request.city,
    notes: request.notes,
    professionalName: request.professional.user.name,
    professionalRole: professionalTypeLabel[request.professional.professionalType],
    neighborhood: request.neighborhood
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
      }
    }
  });

  return { ok: true as const, request: toRequestRecord(updatedRequest) };
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
      professionalProfile: {
        include: {
          documents: true
        }
      }
    }
  });

  const requests = await getCareRequestsForUser(userId);
  const scheduled = requests.filter((request) => ["ACEITO", "AGENDADO"].includes(request.status)).length;
  const completed = requests.filter((request) => request.status === "CONCLUIDO").length;

  return {
    summary: {
      accountType: user.accountType,
      accountTypeLabel: user.accountType === AccountType.PROFESSIONAL ? "Profissional" : "Paciente",
      requests: requests.length,
      scheduled,
      completed,
      verifiedDocuments: user.professionalProfile?.documents.filter((document) => document.status === "VERIFICADO").length ?? 0
    },
    requests,
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
  const [users, patients, professionals, verifiedProfessionals, openRequests, completedRequests, professionalsByType, requestsByStatus] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { accountType: AccountType.PATIENT } }),
      prisma.professionalProfile.count(),
      prisma.professionalProfile.count({ where: { isVerified: true } }),
      prisma.careRequest.count({ where: { status: { in: [CareRequestStatus.ENVIADO, CareRequestStatus.ACEITO, CareRequestStatus.AGENDADO] } } }),
      prisma.careRequest.count({ where: { status: CareRequestStatus.CONCLUIDO } }),
      prisma.professionalProfile.groupBy({
        by: ["professionalType"],
        _count: { _all: true }
      }),
      prisma.careRequest.groupBy({
        by: ["status"],
        _count: { _all: true }
      })
    ]);

  return {
    users,
    patients,
    professionals,
    verifiedProfessionals,
    openRequests,
    completedRequests,
    professionalsByType: professionalsByType.map((item) => ({
      label: professionalTypeLabel[item.professionalType],
      count: item._count._all
    })),
    requestsByStatus: requestsByStatus.map((item) => ({
      label: statusLabel[item.status],
      count: item._count._all
    }))
  };
}
