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
  | "FORTALECIMENTO";

export type ProfessionalTypeCode = "CUIDADOR" | "TECNICO_ENFERMAGEM" | "FISIOTERAPEUTA";
export type GenderCode = "FEMININO" | "MASCULINO" | "OUTRO";
export type GenderPreferenceCode = "FEMININO" | "MASCULINO" | "QUALQUER";
export type TransferSupportCode = "MODERADO" | "ALTO" | "DUPLA";
export type DocumentTypeCode = "RG" | "CPF" | "COREN" | "CREFITO" | "CERTIFICADO" | "REFERENCIA";
export type VerificationStatusCode = "PENDENTE" | "VERIFICADO" | "RECUSADO";
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
  expiresAt: string | null;
  createdAt: string;
  reviewNote: string | null;
  reviewedAt: string | null;
};

export type AdminDocumentReviewData = ProfessionalDocumentData & {
  professionalName: string;
  professionalEmail: string;
  professionalTypeLabel: string;
};

export type ProfessionalSettingsData = {
  professionalType: ProfessionalTypeCode;
  gender: GenderCode;
  age: number;
  phone: string | null;
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
  };
  requests: CareRequestRecord[];
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
};
