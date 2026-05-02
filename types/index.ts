export type TripType = "ROUND_TRIP" | "ONE_WAY";

export const PROGRAM_OPTIONS = [
  { label: "Latam Pass", value: "LATAM_PASS" },
  { label: "Smiles", value: "SMILES" },
  { label: "Azul Fidelidade", value: "AZUL_FIDELIDADE" },
  { label: "TAP Miles&Go", value: "TAP_MILES_GO" },
  { label: "Livelo", value: "LIVELO" },
  { label: "Esfera", value: "ESFERA" },
  { label: "C6 Atomos", value: "C6_ATOMOS" }
] as const;

export type SearchHistoryPoint = {
  date: string;
  label: string;
  miles: number;
};

export type SearchResult = {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string | null;
  program: string;
  programLabel: string;
  milesRequired: number;
  taxesAmount: number;
  cashPrice: number;
  valuePerMile: number;
  bestValueScore: number;
  affiliateUrl: string | null;
  history: SearchHistoryPoint[];
};

export type DashboardData = {
  summary: {
    tier: string;
    tierLabel: string;
    searches: number;
    favoriteCount: number;
    alertCount: number;
  };
  favorites: Array<{
    id: string;
    programLabel: string;
    origin: string;
    destination: string;
    milesRequired: number;
  }>;
  alerts: Array<{
    id: string;
    programLabel: string;
    origin: string;
    destination: string;
    targetMiles: number;
  }>;
  history: Array<{
    label: string;
    miles: number;
  }>;
  programMix: Array<{
    label: string;
    count: number;
  }>;
};

export type AdminOverview = {
  users: number;
  premiumUsers: number;
  trackedOffers: number;
  activeAlerts: number;
  premiumRevenueEstimate: number;
  programDistribution: Array<{
    label: string;
    count: number;
  }>;
  subscriptionMix: Array<{
    label: string;
    value: number;
  }>;
};

export type CareServiceCode =
  | "BANHO"
  | "TRANSFERENCIA"
  | "MEDICACAO"
  | "CURATIVOS"
  | "FISIOTERAPIA"
  | "COMPANHIA"
  | "REFEICAO"
  | "SINAIS_VITAIS"
  | "AVALIACAO"
  | "FORTALECIMENTO"
  | "OUTRO";

export type ProfessionalTypeCode = "CUIDADOR" | "TECNICO_ENFERMAGEM" | "FISIOTERAPEUTA";
export type GenderCode = "FEMININO" | "MASCULINO" | "OUTRO";
export type GenderPreferenceCode = "FEMININO" | "MASCULINO" | "QUALQUER";
export type TransferSupportCode = "MODERADO" | "ALTO" | "DUPLA";
export type DocumentTypeCode = "RG" | "CNH" | "CPF" | "COMPROVANTE_RESIDENCIA" | "COREN" | "CREFITO" | "CERTIFICADO" | "REFERENCIA";
export type VerificationStatusCode = "PENDENTE" | "VERIFICADO" | "RECUSADO";
export type ProfessionalVerificationStatusCode = "PENDENTE" | "EM_ANALISE" | "APROVADO" | "REPROVADO";
export type AvailabilityFilter = "qualquer" | "agora" | "hoje" | "manha" | "tarde" | "noite" | "fim-de-semana";

export type CareProfessional = {
  id: string;
  name: string;
  professionalType: ProfessionalTypeCode;
  roleLabel: string;
  gender: GenderCode;
  genderLabel: string;
  age: number;
  city: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  photoUrl: string | null;
  rating: number;
  reviewCount: number;
  priceLabel: string;
  availableIn: string;
  responseTimeLabel: string;
  supportLevel: TransferSupportCode;
  supportLevelLabel: string;
  mobilitySupport: string;
  services: CareServiceCode[];
  serviceLabels: string[];
  credentials: string[];
  bio: string;
  isVerified: boolean;
  matchScore: number;
};

export type CareSearchResponse = {
  results: CareProfessional[];
  source?: "database" | "demo";
  warning?: string;
  center: {
    city: string;
    neighborhood: string;
    latitude: number;
    longitude: number;
  };
};

export type CareRequestRecord = {
  id: string;
  status: string;
  statusLabel: string;
  serviceLabel: string;
  durationHours: number;
  scheduledFor: string | null;
  createdAt: string;
  requesterName: string;
  requesterPhone: string | null;
  addressLine: string;
  addressNumber: string | null;
  addressComplement: string | null;
  postalCode: string | null;
  city: string;
  state: string | null;
  notes: string | null;
  professionalName: string;
  professionalRole: string;
  neighborhood: string;
};

export type CareRequestDetailsData = CareRequestRecord & {
  requesterEmail: string | null;
  supportNeedLabel: string;
  preferredGenderLabel: string;
  professional: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    roleLabel: string;
    genderLabel: string;
    age: number;
    neighborhood: string;
    city: string;
    supportLevelLabel: string;
    mobilitySupport: string;
    bio: string;
    isVerified: boolean;
  };
  patient: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  viewer: {
    accountType: string;
    canActAsProfessional: boolean;
    canCancelAsPatient: boolean;
  };
};

export type DashboardFavoriteProfessional = {
  id: string;
  name: string;
  professionalType: ProfessionalTypeCode;
  roleLabel: string;
  gender: GenderCode;
  neighborhood: string;
  city: string;
  priceLabel: string;
  availableIn: string;
  supportLevel: TransferSupportCode;
  supportLevelLabel: string;
  serviceCodes: CareServiceCode[];
  services: string[];
  credentials: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  createdAt: string;
};

export type CareNotificationData = {
  id: string;
  type: string;
  title: string;
  body: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AvailabilitySlotData = {
  weekday: number;
  startTime: string;
  endTime: string;
};

export type ProfessionalDocumentData = {
  id: string;
  type: DocumentTypeCode;
  typeLabel: string;
  status: VerificationStatusCode;
  statusLabel: string;
  label: string;
  documentNumber: string | null;
  fileUrl: string | null;
  downloadUrl: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  expiresAt: string | null;
  createdAt: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  externalCheckStatus: string | null;
  externalCheckSource: string | null;
  externalCheckMessage: string | null;
};

export type AdminDocumentReviewData = ProfessionalDocumentData & {
  professionalId: string;
  professionalName: string;
  professionalEmail: string;
  professionalTypeLabel: string;
  professionalVerificationStatus: ProfessionalVerificationStatusCode;
  professionalVerificationStatusLabel: string;
  professionalRegistrationUf: string | null;
  professionalCpfMasked: string | null;
};

export type ProfessionalSettingsData = {
  professionalType: ProfessionalTypeCode;
  gender: GenderCode;
  age: number;
  phone: string | null;
  cpf: string | null;
  professionalRegistrationNumber: string | null;
  professionalRegistrationUf: string | null;
  verificationStatus: ProfessionalVerificationStatusCode;
  verificationStatusLabel: string;
  verificationNote: string | null;
  neighborhood: string;
  addressLine: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  postalCode: string | null;
  serviceRadiusKm: number;
  city: string;
  state: string | null;
  hourlyRate: number;
  sessionRate: number | null;
  bio: string;
  mobilitySupport: string;
  supportLevel: TransferSupportCode;
  services: CareServiceCode[];
  availability: AvailabilitySlotData[];
  documents: ProfessionalDocumentData[];
  requiredDocuments: Array<{
    type: DocumentTypeCode;
    label: string;
    status: VerificationStatusCode | "FALTANDO";
  }>;
};

export type CareDashboardData = {
  summary: {
    accountType: string;
    accountTypeLabel: string;
    requests: number;
    scheduled: number;
    completed: number;
    verifiedDocuments: number;
    favoriteProfessionals: number;
    unreadNotifications: number;
  };
  requests: CareRequestRecord[];
  favoriteProfessionals: DashboardFavoriteProfessional[];
  notifications: CareNotificationData[];
  professionalSettings: ProfessionalSettingsData | null;
  profile: {
    name: string;
    email: string;
    neighborhood: string | null;
    transferNeedLabel: string | null;
    professionalTypeLabel: string | null;
  };
};

export type CareAdminOverview = {
  users: number;
  patients: number;
  professionals: number;
  verifiedProfessionals: number;
  openRequests: number;
  completedRequests: number;
  pendingDocuments: number;
  professionalsByType: Array<{ label: string; count: number }>;
  requestsByStatus: Array<{ label: string; count: number }>;
  documentsForReview: AdminDocumentReviewData[];
  auditLogs: Array<{
    id: string;
    adminUserId: string;
    action: string;
    nextStatus: string | null;
    note: string | null;
    createdAt: string;
  }>;
};
