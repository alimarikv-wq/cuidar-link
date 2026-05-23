"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import {
  Accessibility,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ClipboardCheck,
  Heart,
  HeartHandshake,
  LocateFixed,
  MapPin,
  MessageCircle,
  Phone,
  Plane,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Stethoscope,
  UserRound,
  Weight,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CepAddressFields, type CepAddressValue } from "@/components/ui/cep-address-fields";
import { CARE_REQUEST_PAYMENT_LABEL, careRequestRules } from "@/lib/care-request-disclosures";
import {
  AvailabilityFilter,
  CareProfessional,
  CareSearchResponse,
  CareServiceCode,
  GenderPreferenceCode,
  ProfessionalTypeCode,
  TransferSupportCode
} from "@/types";

type ProfessionalTypeFilter = "TODOS" | ProfessionalTypeCode;
type LocationStatus = "idle" | "locating" | "ready" | "denied" | "unsupported" | "error";
type AgeRangeFilter = "QUALQUER" | "20-30" | "30-40" | "40-50" | "50-60";
type DurationMode = "preset" | "custom";
type PatientPrefillProfile = {
  name: string;
  email: string;
  phone: string | null;
  postalCode: string | null;
  addressLine: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string;
  city: string;
  state: string | null;
  mobilityNotes: string | null;
};

const serviceOptions: Array<{ id: CareServiceCode; label: string; icon: typeof HeartHandshake }> = [
  { id: "BANHO", label: "Banho", icon: HeartHandshake },
  { id: "TRANSFERENCIA", label: "Transferência", icon: Weight },
  { id: "MEDICACAO", label: "Medicação", icon: Stethoscope },
  { id: "FISIOTERAPIA", label: "Fisioterapia", icon: Accessibility },
  { id: "OUTRO", label: "Outro", icon: ClipboardCheck }
];

const professionalTypes: Array<{ value: ProfessionalTypeFilter; label: string }> = [
  { value: "TODOS", label: "Todos" },
  { value: "CUIDADOR", label: "Cuidador" },
  { value: "TECNICO_ENFERMAGEM", label: "Técnico" },
  { value: "ENFERMEIRO", label: "Enfermeiro" },
  { value: "FISIOTERAPEUTA", label: "Fisio" }
];

const genderOptions: Array<{ value: GenderPreferenceCode; label: string }> = [
  { value: "QUALQUER", label: "Qualquer" },
  { value: "FEMININO", label: "Mulher" },
  { value: "MASCULINO", label: "Homem" }
];

const supportOptions: Array<{ value: TransferSupportCode; label: string }> = [
  { value: "MODERADO", label: "Sem preferência" },
  { value: "ALTO", label: "Porte forte" },
  { value: "DUPLA", label: "Duas pessoas" }
];

const ageRangeOptions: Array<{ value: AgeRangeFilter; label: string; min?: number; max?: number }> = [
  { value: "QUALQUER", label: "Qualquer idade" },
  { value: "20-30", label: "20 a 30", min: 20, max: 30 },
  { value: "30-40", label: "30 a 40", min: 30, max: 40 },
  { value: "40-50", label: "40 a 50", min: 40, max: 50 },
  { value: "50-60", label: "50 a 60", min: 50, max: 60 }
];

const careDurationOptions = [
  { value: 2, label: "2 horas" },
  { value: 6, label: "6 horas" },
  { value: 8, label: "8 horas" },
  { value: 12, label: "12 horas" },
  { value: 24, label: "24 horas" }
];

const therapyDurationOptions = [
  { value: 0.75, label: "45 minutos" },
  { value: 1, label: "1 hora" },
  { value: 1.5, label: "1h30" }
];

const availabilityOptions: Array<{ value: AvailabilityFilter; label: string }> = [
  { value: "qualquer", label: "Qualquer horário" },
  { value: "agora", label: "Agora" },
  { value: "hoje", label: "Hoje" },
  { value: "manha", label: "Manhã" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "fim-de-semana", label: "Fim de semana" }
];

const emptyCenter = {
  city: "Porto Alegre",
  neighborhood: "Zona Sul",
  latitude: -30.111947,
  longitude: -51.256708
};

const careServiceValues: CareServiceCode[] = [
  "BANHO",
  "TRANSFERENCIA",
  "MEDICACAO",
  "CURATIVOS",
  "FISIOTERAPIA",
  "COMPANHIA",
  "REFEICAO",
  "SINAIS_VITAIS",
  "AVALIACAO",
  "FORTALECIMENTO",
  "OUTRO"
];
const professionalTypeValues: ProfessionalTypeCode[] = ["CUIDADOR", "TECNICO_ENFERMAGEM", "ENFERMEIRO", "FISIOTERAPEUTA"];
const genderPreferenceValues: GenderPreferenceCode[] = ["FEMININO", "MASCULINO", "QUALQUER"];
const supportNeedValues: TransferSupportCode[] = ["MODERADO", "ALTO", "DUPLA"];
const availabilityValues: AvailabilityFilter[] = ["qualquer", "agora", "hoje", "manha", "tarde", "noite", "fim-de-semana"];

function isOptionValue<T extends string>(options: T[], value: string | null): value is T {
  return Boolean(value && options.includes(value as T));
}

function formatBrasiliaDateInput(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function getDefaultScheduledFor() {
  return `${formatBrasiliaDateInput()}T14:30`;
}

function splitScheduledFor(value: string) {
  const [date, timeValue] = value.split("T");
  return {
    date: date || formatBrasiliaDateInput(),
    time: (timeValue || "14:30").slice(0, 5) || "14:30"
  };
}

function completeTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (!digits) return "";

  const hours = digits.length <= 2 ? Number(digits) : Number(digits.slice(0, 2));
  const minutes = digits.length <= 2 ? 0 : Number(digits.slice(2).padEnd(2, "0"));
  return `${String(Math.min(hours, 23)).padStart(2, "0")}:${String(Math.min(minutes, 59)).padStart(2, "0")}`;
}

function isValidTimeInput(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseInitialService(value: string | null) {
  return isOptionValue(careServiceValues, value) ? value : "BANHO";
}

function parseInitialProfessionalType(value: string | null): ProfessionalTypeFilter {
  return value === "TODOS" || isOptionValue(professionalTypeValues, value) ? value : "TODOS";
}

function parseInitialGenderPreference(value: string | null) {
  return isOptionValue(genderPreferenceValues, value) ? value : "QUALQUER";
}

function parseInitialSupportNeed(value: string | null) {
  return isOptionValue(supportNeedValues, value) ? value : "MODERADO";
}

function parseInitialAvailability(value: string | null) {
  return isOptionValue(availabilityValues, value) ? value : "qualquer";
}

function parseInitialRadius(value: string | null) {
  const radius = Number(value);
  if (!Number.isFinite(radius)) return 8;
  return Math.min(20, Math.max(2, Math.round(radius)));
}

function parseInitialAgeRange(value: string | null): AgeRangeFilter {
  return ageRangeOptions.some((option) => option.value === value) ? (value as AgeRangeFilter) : "QUALQUER";
}

function ageRangeBounds(value: AgeRangeFilter) {
  const option = ageRangeOptions.find((item) => item.value === value);
  return { ageMin: option?.min, ageMax: option?.max };
}

function durationOptionsFor(service: CareServiceCode) {
  return service === "FISIOTERAPIA" ? therapyDurationOptions : careDurationOptions;
}

function formatDurationLabel(durationHours: number) {
  if (durationHours < 1) return `${Math.round(durationHours * 60)} minutos`;
  if (Number.isInteger(durationHours)) return durationHours === 1 ? "1 hora" : `${durationHours} horas`;
  const hours = Math.floor(durationHours);
  const minutes = Math.round((durationHours - hours) * 60);
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function formatRatingValue(rating: number) {
  return rating.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function formatReviewCount(count: number) {
  return count === 1 ? "1 avaliação" : `${count} avaliações`;
}

function formatRatingSummary(rating: number, reviewCount: number) {
  if (reviewCount <= 0) return "Sem avaliações";
  return `${formatRatingValue(rating)} (${formatReviewCount(reviewCount)})`;
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value || "Não informado";
  return `${day}/${month}/${year}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character];
  });
}

function formatAccuracy(value: number | null) {
  if (!value) return "";
  return value >= 1000 ? `aprox. ${(value / 1000).toFixed(1)} km` : `aprox. ${Math.round(value)} m`;
}

const requestFieldBase = "w-full rounded-lg border bg-white px-3 text-sm outline-none transition";

function requiredMark() {
  return <span className="text-rose-600" aria-label="obrigatorio">*</span>;
}

function requestInputClass(invalid?: boolean) {
  return invalid
    ? `${requestFieldBase} h-10 border-rose-400 bg-rose-50/40 focus:border-rose-600 focus:ring-2 focus:ring-rose-100`
    : `${requestFieldBase} h-10 border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100`;
}

function requestTextareaClass(invalid?: boolean) {
  return invalid
    ? `${requestFieldBase} min-h-20 border-rose-400 bg-rose-50/40 py-2 focus:border-rose-600 focus:ring-2 focus:ring-rose-100`
    : `${requestFieldBase} min-h-20 border-slate-300 py-2 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100`;
}

function formatValidationMessage(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return `Falta preencher: ${items[0]}.`;
  return `Faltam preencher: ${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}.`;
}

export function CareMatchApp() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const reviewsSectionRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const favoriteProfessionalIdRef = useRef("");
  const [service, setService] = useState<CareServiceCode>("BANHO");
  const [professionalType, setProfessionalType] = useState<ProfessionalTypeFilter>("TODOS");
  const [genderPreference, setGenderPreference] = useState<GenderPreferenceCode>("QUALQUER");
  const [supportNeed, setSupportNeed] = useState<TransferSupportCode>("MODERADO");
  const [ageRange, setAgeRange] = useState<AgeRangeFilter>("QUALQUER");
  const [availability, setAvailability] = useState<AvailabilityFilter>("qualquer");
  const [travelRequested, setTravelRequested] = useState(false);
  const [fixedContractRequested, setFixedContractRequested] = useState(false);
  const [radius, setRadius] = useState(8);
  const [searchReady, setSearchReady] = useState(false);
  const [searchVersion, setSearchVersion] = useState(0);
  const [results, setResults] = useState<CareProfessional[]>([]);
  const [center, setCenter] = useState(emptyCenter);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataWarning, setDataWarning] = useState("");
  const [mapError, setMapError] = useState("");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestWarning, setRequestWarning] = useState("");
  const [requestPending, setRequestPending] = useState(false);
  const [requestReviewOpen, setRequestReviewOpen] = useState(false);
  const [requestAttempted, setRequestAttempted] = useState(false);
  const [requestRulesAccepted, setRequestRulesAccepted] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [addressLine, setAddressLine] = useState("Zona Sul, Porto Alegre");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [neighborhood, setNeighborhood] = useState("Tristeza");
  const [city, setCity] = useState("Porto Alegre");
  const [stateCode, setStateCode] = useState("RS");
  const [scheduledFor, setScheduledFor] = useState(getDefaultScheduledFor);
  const [durationHours, setDurationHours] = useState(2);
  const [durationMode, setDurationMode] = useState<DurationMode>("preset");
  const [customDurationDetails, setCustomDurationDetails] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [customServiceDetails, setCustomServiceDetails] = useState("");
  const [travelDestination, setTravelDestination] = useState("");
  const [isInternationalTravel, setIsInternationalTravel] = useState(false);
  const [needsUsVisa, setNeedsUsVisa] = useState(false);
  const [travelNotes, setTravelNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [highlightReviews, setHighlightReviews] = useState(false);
  const [reviewsProfessionalId, setReviewsProfessionalId] = useState("");
  const [reviewsList, setReviewsList] = useState<CareProfessional["recentReviews"]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [createdRequestId, setCreatedRequestId] = useState("");
  const [inquiryProfessionalId, setInquiryProfessionalId] = useState("");
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryBody, setInquiryBody] = useState("");
  const [inquiryError, setInquiryError] = useState("");
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryPending, setInquiryPending] = useState(false);
  const [inquiryLookupId, setInquiryLookupId] = useState("");
  const [createdInquiryId, setCreatedInquiryId] = useState("");
  const [hasAuthenticatedSession, setHasAuthenticatedSession] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [favoritePendingId, setFavoritePendingId] = useState("");
  const [favoriteError, setFavoriteError] = useState("");

  useEffect(() => {
    let disposed = false;

    queueMicrotask(() => {
      if (disposed) return;

      const params = new URLSearchParams(window.location.search);
      favoriteProfessionalIdRef.current = params.get("professionalId") || "";
      setService(parseInitialService(params.get("service")));
      setProfessionalType(parseInitialProfessionalType(params.get("professionalType")));
      setGenderPreference(parseInitialGenderPreference(params.get("genderPreference")));
      setSupportNeed(parseInitialSupportNeed(params.get("supportNeed")));
      setAgeRange(parseInitialAgeRange(params.get("ageRange")));
      setAvailability(parseInitialAvailability(params.get("availability")));
      setTravelRequested(params.get("travelRequested") === "true");
      setFixedContractRequested(params.get("fixedContractRequested") === "true");
      setRadius(parseInitialRadius(params.get("radiusKm")));
      setSearchReady(true);
    });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    fetch("/api/patient-profile", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { authenticated?: boolean; profile?: PatientPrefillProfile | null };
        if (!disposed && response.ok) {
          setHasAuthenticatedSession(Boolean(data.authenticated));
        }
        if (disposed || !response.ok || !data.authenticated || !data.profile) return;

        const profile = data.profile;
        setRequesterName((current) => current || profile.name || "");
        setRequesterEmail((current) => current || profile.email || "");
        setRequesterPhone((current) => current || profile.phone || "");
        setPostalCode((current) => current || profile.postalCode || "");
        setAddressLine((current) => profile.addressLine || current);
        setAddressNumber((current) => current || profile.addressNumber || "");
        setAddressComplement((current) => current || profile.addressComplement || "");
        setNeighborhood((current) => profile.neighborhood || current);
        setCity((current) => profile.city || current);
        setStateCode((current) => profile.state || current);
        setNotes((current) => current || profile.mobilityNotes || "");
      })
      .catch(() => {
        // O preenchimento automático é conveniência; o formulário continua editável.
      });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    fetch("/api/professional-favorites")
      .then(async (response) => {
        const data = (await response.json()) as { favoriteIds?: string[] };
        if (!disposed && response.ok) {
          setFavoriteIds(new Set(data.favoriteIds || []));
        }
      })
      .catch(() => {
        if (!disposed) setFavoriteIds(new Set());
      });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!searchReady) return;

    const controller = new AbortController();
    const { ageMin, ageMax } = ageRangeBounds(ageRange);
    const params = new URLSearchParams({
      service,
      genderPreference,
      supportNeed,
      availability,
      travelRequested: String(travelRequested),
      fixedContractRequested: String(fixedContractRequested),
      radiusKm: String(radius),
      latitude: String(center.latitude),
      longitude: String(center.longitude),
      locationSource: locationStatus === "ready" ? "browser" : "default"
    });

    if (professionalType !== "TODOS") {
      params.set("professionalType", professionalType);
    }
    if (ageMin) params.set("ageMin", String(ageMin));
    if (ageMax) params.set("ageMax", String(ageMax));

    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError("");
    });

    fetch(`/api/professionals?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as CareSearchResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Não foi possível buscar profissionais.");
        }
        const requestedProfessionalId = favoriteProfessionalIdRef.current;
        const requestedProfessionalFound = Boolean(
          requestedProfessionalId && data.results.some((professional) => professional.id === requestedProfessionalId)
        );
        const deepLinkWarning =
          requestedProfessionalId && !requestedProfessionalFound
            ? "Não encontrei esse favorito com os filtros atuais. Mostrei profissionais compatíveis para você ajustar a busca."
            : "";

        setResults(data.results);
        setCenter(data.center);
        setDataWarning(data.warning || deepLinkWarning);
        setSelectedId((current) => {
          if (requestedProfessionalFound) return requestedProfessionalId;
          return data.results.some((professional) => professional.id === current) ? current : data.results[0]?.id || "";
        });

        if (requestedProfessionalId) {
          favoriteProfessionalIdRef.current = "";
          if (requestedProfessionalFound) {
            setDetailOpen(true);
            setRequestAttempted(false);
            setRequestSent(false);
            setRequestError("");
            setRequestWarning("");
          }
        }
      })
      .catch((fetchError: Error) => {
        if (controller.signal.aborted) return;
        setResults([]);
        setDataWarning("");
        setError(fetchError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [
    ageRange,
    availability,
    center.latitude,
    center.longitude,
    fixedContractRequested,
    genderPreference,
    locationStatus,
    professionalType,
    radius,
    searchReady,
    searchVersion,
    service,
    supportNeed,
    travelRequested
  ]);

  const selected = useMemo(() => {
    return results.find((professional) => professional.id === selectedId) ?? results[0] ?? null;
  }, [results, selectedId]);
  const inquiryProfessional = useMemo(() => {
    return results.find((professional) => professional.id === inquiryProfessionalId) ?? null;
  }, [results, inquiryProfessionalId]);
  const reviewsProfessional = useMemo(() => {
    return results.find((professional) => professional.id === reviewsProfessionalId) ?? null;
  }, [results, reviewsProfessionalId]);
  const scheduledParts = splitScheduledFor(scheduledFor);
  const availableDurationOptions = durationOptionsFor(service);
  const currentServiceLabel = serviceOptions.find((option) => option.id === service)?.label || "Atendimento";
  const currentSupportLabel = supportOptions.find((option) => option.value === supportNeed)?.label || "Não informado";
  const currentGenderLabel = genderOptions.find((option) => option.value === genderPreference)?.label || "Não informado";
  const requestAddressSummary =
    [
      [addressLine, addressNumber].filter(Boolean).join(", "),
      addressComplement,
      neighborhood,
      city,
      stateCode
    ]
      .filter(Boolean)
      .join(" - ") || "Endereço não informado";
  const requestDurationSummary =
    durationMode === "custom"
      ? `${formatDurationLabel(durationHours)} - ${customDurationDetails.trim() || "detalhe pendente"}`
      : formatDurationLabel(durationHours);
  const visibleDurationOptions = availableDurationOptions.some((option) => option.value === durationHours)
    ? availableDurationOptions
    : [...availableDurationOptions, { value: durationHours, label: `${durationHours} horas` }].sort((a, b) => a.value - b.value);
  const completedScheduledTime = completeTimeInput(scheduledParts.time);
  const requestFieldErrors = {
    requesterName: requestAttempted && !requesterName.trim(),
    requesterEmail: requestAttempted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail.trim()),
    requesterPhone: requestAttempted && requesterPhone.replace(/\D/g, "").length < 10,
    scheduledDate: requestAttempted && !scheduledParts.date,
    scheduledTime:
      requestAttempted &&
      (!isValidTimeInput(completedScheduledTime) || (!availabilityLoading && availableTimes.length > 0 && !availableTimes.includes(completedScheduledTime))),
    postalCode: requestAttempted && !postalCode.trim(),
    addressLine: requestAttempted && !addressLine.trim(),
    addressNumber: requestAttempted && !addressNumber.trim(),
    neighborhood: requestAttempted && !neighborhood.trim(),
    city: requestAttempted && !city.trim(),
    state: requestAttempted && !stateCode.trim(),
    customDurationDetails: requestAttempted && durationMode === "custom" && customDurationDetails.trim().length < 3,
    customServiceDetails: requestAttempted && service === "OUTRO" && customServiceDetails.trim().length < 3,
    travelDestination: requestAttempted && travelRequested && travelDestination.trim().length < 2,
    rulesAccepted: requestAttempted && !requestRulesAccepted
  };

  useEffect(() => {
    if (!detailOpen || !highlightReviews || !selected?.recentReviews.length) return;

    const scrollTimer = window.setTimeout(() => {
      const scrollContainer = detailScrollRef.current;
      const reviewsSection = reviewsSectionRef.current;
      if (!scrollContainer || !reviewsSection) return;

      scrollContainer.scrollTo({
        top: Math.max(reviewsSection.offsetTop - 12, 0),
        behavior: "smooth"
      });
    }, 80);

    const highlightTimer = window.setTimeout(() => setHighlightReviews(false), 2400);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(highlightTimer);
    };
  }, [detailOpen, highlightReviews, selected?.id, selected?.recentReviews.length]);

  useEffect(() => {
    if (!detailOpen || !selected || !scheduledParts.date) {
      queueMicrotask(() => {
        setAvailableTimes([]);
        setAvailabilityError("");
      });
      return;
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      setAvailabilityLoading(true);
      setAvailabilityError("");
    });

    fetch(`/api/professionals/${selected.id}/availability?date=${scheduledParts.date}&durationHours=${durationHours}`, {
      signal: controller.signal
    })
      .then(async (response) => {
        const data = (await response.json()) as { date?: string; slots?: string[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar horários.");

        const slots = data.slots || [];
        const availableDate = data.date || scheduledParts.date;
        setAvailableTimes(slots);
        if (slots.length === 0) {
          setAvailabilityError("Esse profissional não tem horário livre nos próximos dias para a duração escolhida.");
          return;
        }

        if (availableDate !== scheduledParts.date) {
          setAvailabilityError(`Sem horário nessa data. Mostrando o primeiro horário livre em ${formatDateLabel(availableDate)}.`);
        }

        setScheduledFor((current) => {
          const currentParts = splitScheduledFor(current);
          const currentTime = completeTimeInput(currentParts.time);
          return currentParts.date === availableDate && slots.includes(currentTime) ? current : `${availableDate}T${slots[0]}`;
        });
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setAvailableTimes([]);
        setAvailabilityError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      });

    return () => controller.abort();
  }, [detailOpen, durationHours, scheduledParts.date, selected]);

  function updateScheduledDate(date: string) {
    setScheduledFor(`${date}T${scheduledParts.time}`);
  }

  function selectService(nextService: CareServiceCode) {
    setService(nextService);
    setRequestReviewOpen(false);
    const nextOptions = durationOptionsFor(nextService);
    if (!nextOptions.some((option) => option.value === durationHours)) {
      setDurationHours(nextOptions[0].value);
    }
  }

  function selectProfessional(id: string, options?: { showReviews?: boolean }) {
    const professional = results.find((item) => item.id === id);
    setSelectedId(id);
    if (fixedContractRequested && professional && !professional.acceptsFixedContract) {
      setFixedContractRequested(false);
    }
    setDetailOpen(true);
    setHighlightReviews(Boolean(options?.showReviews));
    setRequestAttempted(false);
    setRequestSent(false);
    setRequestError("");
    setRequestWarning("");
    setRequestReviewOpen(false);
    setRequestRulesAccepted(false);
    setCreatedRequestId("");
  }

  function closeDetails() {
    setDetailOpen(false);
    setHighlightReviews(false);
    setRequestAttempted(false);
    setRequestError("");
    setRequestReviewOpen(false);
    setRequestRulesAccepted(false);
    setCreatedRequestId("");
  }

  function openReviews(professionalId: string) {
    setReviewsProfessionalId(professionalId);
    setReviewsList([]);
    setReviewsError("");
    setReviewsLoading(true);

    fetch(`/api/professionals/${professionalId}/reviews`)
      .then(async (response) => {
        const data = (await response.json()) as { reviews?: CareProfessional["recentReviews"]; error?: string };
        if (!response.ok) throw new Error(data.error || "Não foi possível carregar avaliações.");
        setReviewsList(data.reviews || []);
      })
      .catch((error: Error) => {
        setReviewsError(error.message);
      })
      .finally(() => setReviewsLoading(false));
  }

  function closeReviews() {
    setReviewsProfessionalId("");
    setReviewsList([]);
    setReviewsError("");
    setReviewsLoading(false);
  }

  function prepareInquiryModal(professionalId: string) {
    const professional = results.find((item) => item.id === professionalId);
    setInquiryProfessionalId(professionalId);
    setInquiryName(requesterName);
    setInquiryEmail(requesterEmail);
    setInquiryPhone(requesterPhone);
    if (fixedContractRequested && professional && !professional.acceptsFixedContract) {
      setFixedContractRequested(false);
    }
    setInquiryBody("");
    setInquiryError("");
    setInquirySent(false);
    setInquiryPending(false);
    setCreatedInquiryId("");
  }

  async function openInquiry(professionalId: string) {
    if (!hasAuthenticatedSession) {
      prepareInquiryModal(professionalId);
      return;
    }

    setInquiryError("");
    setInquiryLookupId(professionalId);

    try {
      const response = await fetch(`/api/professional-inquiries?professionalId=${encodeURIComponent(professionalId)}`, {
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({ inquiry: null }));

      if (response.ok && data.inquiry?.id) {
        router.push(`/dashboard/mensagens/${data.inquiry.id}`);
        return;
      }
    } catch {
      // Se a consulta falhar, mantemos o caminho normal de abrir a tela de mensagem.
    } finally {
      setInquiryLookupId("");
    }

    prepareInquiryModal(professionalId);
  }

  function closeInquiry() {
    setInquiryProfessionalId("");
    setInquiryError("");
    setInquiryPending(false);
    setCreatedInquiryId("");
  }

  async function toggleFavorite(professionalId: string) {
    const isFavorite = favoriteIds.has(professionalId);
    setFavoriteError("");
    setFavoritePendingId(professionalId);

    const response = await fetch("/api/professional-favorites", {
      method: isFavorite ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professionalId })
    });

    setFavoritePendingId("");

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "" }));
      setFavoriteError(data.error || "Não foi possível atualizar favoritos.");
      return;
    }

    setFavoriteIds((current) => {
      const next = new Set(current);
      if (isFavorite) {
        next.delete(professionalId);
      } else {
        next.add(professionalId);
      }
      return next;
    });
  }

  async function submitInquiry() {
    if (!inquiryProfessional || inquiryPending || inquirySent) return;

    const name = inquiryName.trim();
    const email = inquiryEmail.trim();
    const phone = inquiryPhone.trim();
    const body = inquiryBody.trim();

    if (name.length < 2) {
      setInquiryError("Informe seu nome para o profissional saber com quem esta falando.");
      return;
    }

    if (!email && !phone) {
      setInquiryError("Informe e-mail ou telefone para o profissional conseguir responder.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInquiryError("Informe um e-mail valido.");
      return;
    }

    if (body.length < 1) {
      setInquiryError("Escreva sua dúvida antes de enviar.");
      return;
    }

    setInquiryError("");
    setInquiryPending(true);

    const response = await fetch("/api/professional-inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: inquiryProfessional.id,
        requesterName: name,
        requesterEmail: email,
        requesterPhone: phone,
        fixedContractRequested,
        body
      })
    });
    const data = await response.json().catch(() => ({ error: "" }));

    setInquiryPending(false);

    if (!response.ok) {
      setInquiryError(data.error || "Não foi possível enviar a mensagem.");
      return;
    }

    const inquiryId = data.inquiry?.id || "";

    if (hasAuthenticatedSession && inquiryId) {
      router.push(`/dashboard/mensagens/${inquiryId}`);
      return;
    }

    setCreatedInquiryId(inquiryId);
    setInquirySent(true);
  }

  function validateRequestForm() {
    const missingFields = [
      !requesterName.trim() ? "nome do paciente" : "",
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail.trim()) ? "e-mail válido" : "",
      requesterPhone.replace(/\D/g, "").length < 10 ? "telefone com DDD" : "",
      !scheduledParts.date ? "data" : "",
      !isValidTimeInput(completedScheduledTime) ? "horário" : "",
      availabilityLoading ? "aguardar horários disponíveis" : "",
      !availabilityLoading && availableTimes.length === 0 ? "horário disponível na agenda do profissional" : "",
      !availabilityLoading && availableTimes.length > 0 && !availableTimes.includes(completedScheduledTime) ? "horário disponível na agenda do profissional" : "",
      !postalCode.trim() ? "CEP" : "",
      !addressLine.trim() ? "endereço" : "",
      !addressNumber.trim() ? "número" : "",
      !neighborhood.trim() ? "bairro" : "",
      !city.trim() ? "cidade" : "",
      !stateCode.trim() ? "UF" : "",
      durationMode === "custom" && customDurationDetails.trim().length < 3 ? "detalhe da duração personalizada" : "",
      service === "OUTRO" && customServiceDetails.trim().length < 3 ? "descrição do outro atendimento" : "",
      travelRequested && travelDestination.trim().length < 2 ? "destino da viagem" : "",
      travelRequested && isInternationalTravel && selected && !selected.hasPassport ? "profissional com passaporte informado" : "",
      travelRequested && needsUsVisa && selected && !selected.hasUsVisa ? "profissional com visto americano informado" : "",
      fixedContractRequested && selected && !selected.acceptsFixedContract ? "profissional disponível para contrato fixo" : "",
      !requestRulesAccepted ? "aceite das regras do atendimento" : ""
    ].filter(Boolean);

    return formatValidationMessage(missingFields);
  }

  function openRequestReview() {
    if (!selected || requestPending || requestSent) return;
    setRequestAttempted(true);
    setRequestReviewOpen(false);
    const validationError = validateRequestForm();

    if (validationError) {
      setRequestError(validationError);
      return;
    }

    setRequestError("");
    setRequestWarning("");
    setRequestReviewOpen(true);
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unsupported");
      setLocationError("Seu navegador não liberou geolocalização.");
      return;
    }

    setLocationStatus("locating");
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCenter = {
          city: "Porto Alegre",
          neighborhood: "Sua localização",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        setCenter(nextCenter);
        setLocationAccuracy(position.coords.accuracy);
        setLocationStatus("ready");
        setAddressLine("Localização atual aproximada");
        setNeighborhood("Sua localização");
        setCity(nextCenter.city);
        setSearchVersion((current) => current + 1);
      },
      (locationProblem) => {
        if (locationProblem.code === locationProblem.PERMISSION_DENIED) {
          setLocationStatus("denied");
          setLocationError("Permissão de localização negada no navegador.");
          return;
        }

        setLocationStatus("error");
        setLocationError("Não foi possível obter sua localização agora.");
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 }
    );
  }

  useEffect(() => {
    let disposed = false;

    async function renderMap() {
      if (!mapContainerRef.current) return;

      try {
        const L = await import("leaflet");
        if (disposed || !mapContainerRef.current) return;

        const centerPoint: [number, number] = [center.latitude, center.longitude];

        if (!mapRef.current) {
          mapRef.current = L.map(mapContainerRef.current, {
            scrollWheelZoom: false,
            zoomControl: true
          }).setView(centerPoint, 13);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }).addTo(mapRef.current);
        }

        const map = mapRef.current;
        markerRefs.current.forEach((marker) => marker.remove());
        markerRefs.current = [];

        const patientIcon = L.divIcon({
          className: "",
          html: '<span class="care-map-marker care-map-marker--patient">Você</span>',
          iconSize: [54, 34],
          iconAnchor: [27, 17]
        });
        const patientMarker = L.marker(centerPoint, { icon: patientIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup(locationStatus === "ready" ? "Sua localização aproximada" : "Centro inicial da busca");
        markerRefs.current.push(patientMarker);

        const bounds = L.latLngBounds([centerPoint]);

        results.forEach((professional) => {
          const isSelected = selectedId === professional.id;
          const professionalIcon = L.divIcon({
            className: "",
            html: `<span class="care-map-marker ${isSelected ? "care-map-marker--selected" : "care-map-marker--professional"}">${professional.distanceKm.toFixed(1)} km</span>`,
            iconSize: [58, 34],
            iconAnchor: [29, 17]
          });
          const professionalPoint: [number, number] = [professional.latitude, professional.longitude];
          const marker = L.marker(professionalPoint, {
            icon: professionalIcon,
            zIndexOffset: isSelected ? 900 : 500
          })
            .addTo(map)
            .bindPopup(
              `<strong>${escapeHtml(professional.name)}</strong><br>${escapeHtml(professional.roleLabel)}<br>${professional.distanceKm.toFixed(1)} km`
            );

          marker.on("click", () => selectProfessional(professional.id));
          markerRefs.current.push(marker);
          bounds.extend(professionalPoint);
        });

        if (results.length > 0) {
          map.fitBounds(bounds.pad(0.28), { animate: true, maxZoom: radius <= 5 ? 14 : 13 });
        } else {
          map.setView(centerPoint, radius <= 5 ? 14 : 13);
        }

        setMapError("");
      } catch {
        if (!disposed) setMapError("Não foi possível carregar o mapa agora.");
      }
    }

    renderMap();

    return () => {
      disposed = true;
    };
  }, [center.latitude, center.longitude, locationStatus, radius, results, selectedId]);

  useEffect(() => {
    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  async function submitRequest() {
    if (!selected || requestPending || requestSent) return;
    setRequestAttempted(true);
    const validationError = validateRequestForm();
    if (validationError) {
      setRequestError(validationError);
      return;
    }

    setRequestPending(true);
    setRequestError("");
    setRequestWarning("");
    const safeScheduledFor = `${scheduledParts.date}T${completedScheduledTime}`;
    const requestNotes = [
      durationMode === "custom"
        ? `Duração personalizada: reservar ${formatDurationLabel(durationHours)} na agenda. ${customDurationDetails.trim()}`
        : "",
      travelRequested
        ? [
            `Acompanhamento em viagem: ${travelDestination.trim()}`,
            isInternationalTravel ? "Viagem internacional" : "Viagem nacional/local",
            needsUsVisa ? "Destino exige visto americano" : "",
            travelNotes.trim() ? `Detalhes da viagem: ${travelNotes.trim()}` : ""
          ]
            .filter(Boolean)
            .join(" | ")
        : "",
      service === "OUTRO" ? `Outro atendimento: ${customServiceDetails.trim()}` : "",
      fixedContractRequested ? "Interesse em rotina fixa/contrato fixo com o profissional." : "",
      notes.trim()
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await fetch("/api/care-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: selected.id,
        requesterName,
        requesterEmail,
        requesterPhone,
        service,
        supportNeed,
        preferredGender: genderPreference,
        scheduledFor: safeScheduledFor,
        durationHours,
        addressLine,
        addressNumber,
        addressComplement,
        postalCode,
        neighborhood,
        city,
        state: stateCode,
        latitude: center.latitude,
        longitude: center.longitude,
        travelRequested,
        fixedContractRequested,
        travelDestination,
        isInternationalTravel,
        needsUsVisa,
        travelNotes,
        notes: requestNotes,
        rulesAccepted: requestRulesAccepted
      })
    });

    const data = await response.json().catch(() => ({ error: "" }));
    setRequestPending(false);

    if (!response.ok) {
      setRequestError(data.error || "Não foi possível enviar a solicitação.");
      return;
    }

    setRequestWarning(data.warning || "");
    setCreatedRequestId(data.request?.id || "");
    setRequestSent(true);
    setRequestReviewOpen(false);
  }

  function updateRequestAddress(nextAddress: CepAddressValue) {
    setPostalCode(nextAddress.postalCode);
    setAddressLine(nextAddress.addressLine);
    setAddressNumber(nextAddress.addressNumber);
    setAddressComplement(nextAddress.addressComplement);
    setNeighborhood(nextAddress.neighborhood);
    setCity(nextAddress.city);
    setStateCode(nextAddress.state);
  }

  return (
    <div className="surface space-y-6">
      <section id="busca" className="scroll-mt-24 grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="request-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Paciente PCD</p>
              <h1 id="request-title" className="mt-1 text-3xl font-semibold leading-tight text-slate-950">
                Cuidado domiciliar perto de você
              </h1>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Accessibility aria-hidden="true" className="h-6 w-6" />
            </span>
          </div>

          <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
              <LocateFixed aria-hidden="true" className="h-4 w-4" />
              {center.neighborhood}, {center.city}
            </div>
            <p className="mt-1 text-sm text-emerald-900">
              {locationStatus === "ready" ? `GPS ativo, precisao ${formatAccuracy(locationAccuracy)}.` : "Busca inicial na Zona Sul."}
            </p>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locationStatus === "locating"}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
            >
              <LocateFixed aria-hidden="true" className="h-4 w-4" />
              {locationStatus === "locating" ? "Localizando..." : "Usar minha localização"}
            </button>
            {locationError ? <p className="mt-2 text-sm font-medium text-rose-700">{locationError}</p> : null}
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-800" htmlFor="professional-type">
                Profissional
              </label>
              <select
                id="professional-type"
                value={professionalType}
                onChange={(event) => setProfessionalType(event.target.value as ProfessionalTypeFilter)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {professionalTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">Preciso de ajuda com</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {serviceOptions.map((option) => {
                  const Icon = option.icon;
                  const active = service === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectService(option.id)}
                      className={`flex h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                        active
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {service === "OUTRO" ? (
                <textarea
                  value={customServiceDetails}
                  onChange={(event) => setCustomServiceDetails(event.target.value)}
                  placeholder="Ex.: apoio para consulta, higiene no leito, troca de curativo especifico..."
                  className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-start gap-3 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={travelRequested}
                  onChange={(event) => setTravelRequested(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700"
                />
                <span>
                  Preciso de acompanhante para viagem
                  <span className="block pt-1 text-sm font-normal leading-5 text-slate-600">
                    Mostra somente profissionais que marcaram disponibilidade para acompanhar viagens.
                  </span>
                </span>
              </label>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-start gap-3 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={fixedContractRequested}
                  onChange={(event) => setFixedContractRequested(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700"
                />
                <span>
                  Tenho interesse em rotina fixa
                  <span className="block pt-1 text-sm font-normal leading-5 text-slate-600">
                    Mostra profissionais disponíveis para contrato fixo, escala recorrente ou CLT.
                  </span>
                </span>
              </label>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">Preferência no cuidado íntimo</p>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Preferência no cuidado íntimo">
                {genderOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGenderPreference(option.value)}
                    className={`h-11 rounded-lg border px-2 text-sm font-semibold transition ${
                      genderPreference === option.value
                        ? "border-violet-700 bg-violet-700 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">Porte físico desejado</p>
              <div className="mt-2 grid gap-2">
                {supportOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSupportNeed(option.value)}
                    className={`flex h-11 items-center justify-between rounded-lg border px-3 text-sm font-semibold transition ${
                      supportNeed === option.value
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {option.label}
                    {supportNeed === option.value ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-800" htmlFor="age-range">
                Idade do profissional
              </label>
              <select
                id="age-range"
                value={ageRange}
                onChange={(event) => setAgeRange(event.target.value as AgeRangeFilter)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {ageRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="availability">
                  Disponibilidade
                </label>
                <select
                  id="availability"
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  {availabilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="radius">
                    Raio de busca
                  </label>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">{radius} km</span>
                </div>
                <input
                  id="radius"
                  type="range"
                  min={2}
                  max={20}
                  step={1}
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                  className="mt-3 w-full accent-emerald-700"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setSearchVersion((current) => current + 1)}
              className="h-12 w-full gap-2 bg-emerald-700 hover:bg-emerald-800"
              disabled={loading}
            >
              <Search aria-hidden="true" className="h-4 w-4" />
              {loading ? "Buscando..." : "Atualizar busca"}
            </Button>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Profissionais próximos</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                    {loading ? "Buscando..." : `${results.length} ${results.length === 1 ? "opção encontrada" : "opções encontradas"}`}
                  </h2>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                  <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                  Ordenado por compatibilidade
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-[#eef4ef]">
                <div
                  ref={mapContainerRef}
                  className="relative z-0 h-72 w-full"
                  aria-label="Mapa com sua localização e profissionais próximos"
                />
              </div>
              {mapError ? <p className="mt-2 text-sm text-rose-700">{mapError}</p> : null}
            </div>

            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}

            {dataWarning ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{dataWarning}</div>
            ) : null}

            {favoriteError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{favoriteError}</div>
            ) : null}

            {!loading && !error && results.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                Nenhum profissional bate com todos os filtros. Amplie o raio ou troque a disponibilidade.
              </div>
            ) : null}

            <div className="grid gap-3">
              {results.map((professional) => (
                <article
                  key={professional.id}
                  className={`rounded-lg border bg-white p-4 shadow-sm transition ${
                    selected?.id === professional.id ? "border-emerald-600 ring-2 ring-emerald-100" : "border-slate-200"
                  }`}
                >
                  <div className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)_160px]">
                    <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-slate-100">
                      {professional.photoUrl ? (
                        <Image src={professional.photoUrl} alt={professional.name} fill sizes="96px" className="object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-400">
                          <UserRound aria-hidden="true" className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-slate-950">{professional.name}</h3>
                        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                          {professional.matchScore}% match
                        </span>
                        {professional.reviewCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => openReviews(professional.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300"
                            aria-label={`Abrir avaliações de ${professional.name}`}
                          >
                            <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                            {formatRatingSummary(professional.rating, professional.reviewCount)}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                            <Star aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                            {formatRatingSummary(professional.rating, professional.reviewCount)}
                          </span>
                        )}
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {professional.age} anos
                        </span>
                        {professional.isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                            Verificado
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-700">{professional.roleLabel}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin aria-hidden="true" className="h-4 w-4 text-emerald-700" />
                          {professional.neighborhood}, {professional.distanceKm.toFixed(1)} km
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock aria-hidden="true" className="h-4 w-4 text-violet-700" />
                          {professional.availableIn}
                        </span>
                        {professional.acceptsTravel ? (
                          <span className="inline-flex items-center gap-1">
                            <Plane aria-hidden="true" className="h-4 w-4 text-sky-700" />
                            Aceita viagem
                          </span>
                        ) : null}
                        {professional.acceptsFixedContract ? (
                          <span className="inline-flex items-center gap-1">
                            <BriefcaseBusiness aria-hidden="true" className="h-4 w-4 text-emerald-700" />
                            Aceita rotina fixa
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{professional.mobilitySupport}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {professional.credentials.slice(0, 3).map((credential) => (
                          <span key={credential} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                            {credential}
                          </span>
                        ))}
                        {professional.acceptsTravel ? (
                          <span className="rounded-lg border border-sky-100 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
                            Viagens
                          </span>
                        ) : null}
                        {professional.acceptsFixedContract ? (
                          <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                            Rotina fixa
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-3 md:items-end">
                      <div className="flex w-full items-start justify-between gap-3 md:justify-end">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(professional.id)}
                          disabled={favoritePendingId === professional.id}
                          aria-pressed={favoriteIds.has(professional.id)}
                          aria-label={favoriteIds.has(professional.id) ? "Remover dos favoritos" : "Salvar nos favoritos"}
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border transition ${
                            favoriteIds.has(professional.id)
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:text-rose-600"
                          }`}
                        >
                          <Heart aria-hidden="true" className={`h-4 w-4 ${favoriteIds.has(professional.id) ? "fill-current" : ""}`} />
                        </button>
                        <div className="md:text-right">
                          <p className="text-sm text-slate-500">Pagamento</p>
                          <p className="text-lg font-semibold text-slate-950">{professional.priceLabel}</p>
                          <p className="mt-1 text-sm text-slate-500">combine antes do atendimento</p>
                          <p className="text-sm text-slate-500">responde em {professional.responseTimeLabel}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 md:flex-col">
                        <Button
                          type="button"
                          onClick={() => selectProfessional(professional.id)}
                          className="h-10 gap-2 bg-slate-950 hover:bg-slate-800"
                        >
                          <UserRound aria-hidden="true" className="h-4 w-4" />
                          Ver detalhes
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openInquiry(professional.id)}
                          disabled={inquiryLookupId === professional.id}
                          className="h-10 gap-2"
                        >
                          <MessageCircle aria-hidden="true" className="h-4 w-4" />
                          {inquiryLookupId === professional.id ? "Abrindo..." : "Mensagem"}
                        </Button>
                        {professional.whatsappUrl ? (
                          <a
                            href={professional.whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                          >
                            <MessageCircle aria-hidden="true" className="h-4 w-4" />
                            WhatsApp
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside
            className={
              detailOpen && selected
                ? "fixed inset-0 z-[2000] grid place-items-center overflow-hidden bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4"
                : "hidden"
            }
            role="dialog"
            aria-modal="true"
            aria-label="Solicitar atendimento"
          >
            {selected ? (
              <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                <button
                  type="button"
                  onClick={closeDetails}
                  className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-950"
                  aria-label="Fechar detalhes"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
                <div ref={detailScrollRef} className="overflow-y-auto p-4 pb-5 sm:p-5">
                  <div className="relative h-32 overflow-hidden rounded-lg bg-slate-100 sm:h-40">
                    {selected.photoUrl ? (
                      <Image src={selected.photoUrl} alt={selected.name} fill sizes="360px" className="object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-slate-400">
                        <UserRound aria-hidden="true" className="h-10 w-10" />
                      </div>
                    )}
                    {selected.isVerified ? (
                      <div className="absolute left-3 top-3 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-800">
                        Verificada
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-semibold text-emerald-700">{selected.roleLabel}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-950">{selected.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{selected.bio}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-200 py-4">
                    <div>
                      <p className="text-sm text-slate-500">Distância</p>
                      <p className="font-semibold text-slate-950">{selected.distanceKm.toFixed(1)} km</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Chegada</p>
                      <p className="font-semibold text-slate-950">{selected.availableIn}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Avaliação</p>
                      <p className="font-semibold text-slate-950">
                        {selected.reviewCount > 0 ? `${formatRatingValue(selected.rating)} de 5` : "Sem avaliações"}
                      </p>
                      {selected.reviewCount > 0 ? (
                        <p className="text-xs text-slate-500">{formatReviewCount(selected.reviewCount)}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Cuidado</p>
                      <p className="font-semibold text-slate-950">{selected.genderLabel}</p>
                    </div>
                  </div>

                  {selected.recentReviews.length > 0 ? (
                    <div
                      ref={reviewsSectionRef}
                      className={`mt-4 rounded-lg border bg-amber-50 p-3 transition ${
                        highlightReviews ? "border-amber-400 ring-2 ring-amber-200" : "border-amber-100"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-amber-950">Avaliações recentes</p>
                          <p className="mt-1 text-xs font-medium text-amber-800">
                            {formatReviewCount(selected.reviewCount)} no histórico deste profissional.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-amber-800">
                            <Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            Nota {formatRatingValue(selected.rating)}
                          </span>
                          <button
                            type="button"
                            onClick={() => openReviews(selected.id)}
                            className="rounded-lg border border-amber-200 bg-white px-2 py-1 text-xs font-semibold text-amber-900 transition hover:border-amber-400"
                          >
                            Ver avaliações
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3">
                        {selected.recentReviews.slice(0, 2).map((review) => (
                          <div key={review.id} className="rounded-lg bg-white/80 p-3 text-sm text-slate-700">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-950">{review.reviewerName}</span>
                              <span className="inline-flex items-center gap-1 text-amber-700">
                                <Star aria-hidden="true" className="h-4 w-4 fill-amber-500" />
                                {formatRatingValue(review.rating)}/5
                              </span>
                            </div>
                            {review.comment ? (
                              <p className="mt-2 line-clamp-2 leading-6">{review.comment}</p>
                            ) : (
                              <p className="mt-2 text-slate-500">Avaliação sem comentário.</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {selected.whatsappUrl ? (
                      <a
                        href={selected.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      >
                        <MessageCircle aria-hidden="true" className="h-4 w-4" />
                        Falar no WhatsApp
                      </a>
                    ) : null}
                    {selected.credentials.map((credential) => (
                      <div key={credential} className="flex items-center gap-2 text-sm text-slate-700">
                        <ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-700" />
                        {credential}
                      </div>
                    ))}
                    {selected.acceptsTravel ? (
                      <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm text-sky-950">
                        <div className="flex items-center gap-2 font-semibold">
                          <Plane aria-hidden="true" className="h-4 w-4" />
                          Disponivel para viagens
                        </div>
                        <p className="mt-1 text-sky-900">
                          {[
                            selected.hasPassport ? "Passaporte informado" : "",
                            selected.hasUsVisa ? "Visto EUA informado" : ""
                          ]
                            .filter(Boolean)
                            .join(" | ") || "Viagens sob alinhamento previo"}
                        </p>
                        {selected.travelNotes ? <p className="mt-1 text-sky-900">{selected.travelNotes}</p> : null}
                      </div>
                    ) : null}
                    {selected.acceptsFixedContract ? (
                      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950">
                        <div className="flex items-center gap-2 font-semibold">
                          <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" />
                          Disponível para rotina fixa
                        </div>
                        <p className="mt-1 text-emerald-900">
                          Pode avaliar contrato fixo, escala recorrente ou CLT diretamente com paciente ou família.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">
                      <span>Nome do paciente {requiredMark()}</span>
                      <input
                        required
                        value={requesterName}
                        onChange={(event) => setRequesterName(event.target.value)}
                        placeholder="Nome do paciente"
                        aria-invalid={requestFieldErrors.requesterName ? "true" : undefined}
                        className={requestInputClass(requestFieldErrors.requesterName)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">
                      <span>E-mail para atualizações {requiredMark()}</span>
                      <input
                        required
                        type="email"
                        value={requesterEmail}
                        onChange={(event) => setRequesterEmail(event.target.value)}
                        placeholder="email@exemplo.com"
                        aria-invalid={requestFieldErrors.requesterEmail ? "true" : undefined}
                        className={requestInputClass(requestFieldErrors.requesterEmail)}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">
                      <span>Telefone com DDD {requiredMark()}</span>
                      <input
                        required
                        value={requesterPhone}
                        onChange={(event) => setRequesterPhone(event.target.value)}
                        placeholder="(51) 99999-0101"
                        aria-invalid={requestFieldErrors.requesterPhone ? "true" : undefined}
                        className={requestInputClass(requestFieldErrors.requesterPhone)}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm font-semibold text-slate-700">
                        <span>Data {requiredMark()}</span>
                        <input
                          type="date"
                          required
                          min={formatBrasiliaDateInput()}
                          value={scheduledParts.date}
                          onChange={(event) => updateScheduledDate(event.target.value)}
                          aria-invalid={requestFieldErrors.scheduledDate ? "true" : undefined}
                          className={requestInputClass(requestFieldErrors.scheduledDate)}
                        />
                      </label>
                      <label className="grid gap-1 text-sm font-semibold text-slate-700">
                        <span>Horário de Brasília {requiredMark()}</span>
                        <select
                          required
                          disabled={availabilityLoading || availableTimes.length === 0}
                          value={scheduledParts.time}
                          onChange={(event) => setScheduledFor(`${scheduledParts.date}T${event.target.value}`)}
                          aria-invalid={requestFieldErrors.scheduledTime ? "true" : undefined}
                          className={requestInputClass(requestFieldErrors.scheduledTime)}
                        >
                          {availabilityLoading ? <option value={scheduledParts.time}>Carregando...</option> : null}
                          {!availabilityLoading && availableTimes.length === 0 ? <option value={scheduledParts.time}>Sem horário livre</option> : null}
                          {!availabilityLoading
                            ? availableTimes.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))
                            : null}
                        </select>
                      </label>
                    </div>
                    {availabilityError ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                        {availabilityError}
                      </div>
                    ) : null}
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">
                      Duração do atendimento
                      <select
                        value={durationMode === "custom" ? "OUTRO" : String(durationHours)}
                        onChange={(event) => {
                          if (event.target.value === "OUTRO") {
                            setDurationMode("custom");
                            return;
                          }

                          setDurationMode("preset");
                          setDurationHours(Number(event.target.value));
                          setCustomDurationDetails("");
                        }}
                        className={requestInputClass(false)}
                      >
                        {visibleDurationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                        <option value="OUTRO">Outra duração</option>
                      </select>
                    </label>
                    {durationMode === "custom" ? (
                      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[160px_1fr]">
                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          Horas na agenda
                          <input
                            type="number"
                            min="0.5"
                            max="24"
                            step="0.5"
                            value={durationHours}
                            onChange={(event) => setDurationHours(Math.min(24, Math.max(0.5, Number(event.target.value) || 2)))}
                            className={requestInputClass(false)}
                          />
                        </label>
                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          <span>Detalhe da duração {requiredMark()}</span>
                          <input
                            value={customDurationDetails}
                            onChange={(event) => setCustomDurationDetails(event.target.value)}
                            placeholder="Ex.: 3 horas, pernoite, plantao especial..."
                            aria-invalid={requestFieldErrors.customDurationDetails ? "true" : undefined}
                            className={requestInputClass(requestFieldErrors.customDurationDetails)}
                          />
                        </label>
                      </div>
                    ) : null}
                    {service === "OUTRO" ? (
                      <label className="grid gap-1 text-sm font-semibold text-slate-700">
                        <span>Descrição do atendimento {requiredMark()}</span>
                        <textarea
                          required
                          value={customServiceDetails}
                          onChange={(event) => setCustomServiceDetails(event.target.value)}
                          placeholder="Descreva qual atendimento você precisa"
                          aria-invalid={requestFieldErrors.customServiceDetails ? "true" : undefined}
                          className={requestTextareaClass(requestFieldErrors.customServiceDetails)}
                        />
                      </label>
                    ) : null}
                    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <label className="flex items-start gap-3 text-sm font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={fixedContractRequested}
                          onChange={(event) => setFixedContractRequested(event.target.checked)}
                          disabled={!selected.acceptsFixedContract}
                          className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700 disabled:opacity-50"
                        />
                        <span>
                          Tenho interesse em rotina fixa ou contrato fixo
                          <span className="block pt-1 text-sm font-normal leading-5 text-slate-600">
                            {selected.acceptsFixedContract
                              ? "Use quando quiser combinar escala recorrente, trabalho fixo ou CLT."
                              : "Esse profissional não marcou disponibilidade para contrato fixo."}
                          </span>
                        </span>
                      </label>
                    </div>
                    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <label className="flex items-start gap-3 text-sm font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={travelRequested}
                          onChange={(event) => setTravelRequested(event.target.checked)}
                          disabled={!selected.acceptsTravel}
                          className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700 disabled:opacity-50"
                        />
                        <span>
                          Este pedido envolve acompanhamento em viagem
                          <span className="block pt-1 text-sm font-normal leading-5 text-slate-600">
                            {selected.acceptsTravel
                              ? "Informe destino e detalhes principais para o profissional avaliar."
                              : "Esse profissional não marcou disponibilidade para viagens."}
                          </span>
                        </span>
                      </label>

                      {travelRequested ? (
                        <div className="grid gap-3">
                          <label className="grid gap-1 text-sm font-semibold text-slate-700">
                            <span>Destino da viagem {requiredMark()}</span>
                            <input
                              value={travelDestination}
                              onChange={(event) => setTravelDestination(event.target.value)}
                              placeholder="Ex.: Gramado, Sao Paulo, Miami..."
                              aria-invalid={requestFieldErrors.travelDestination ? "true" : undefined}
                              className={requestInputClass(requestFieldErrors.travelDestination)}
                            />
                          </label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={isInternationalTravel}
                                onChange={(event) => {
                                  setIsInternationalTravel(event.target.checked);
                                  if (!event.target.checked) setNeedsUsVisa(false);
                                }}
                                className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                              />
                              Viagem internacional
                            </label>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={needsUsVisa}
                                onChange={(event) => setNeedsUsVisa(event.target.checked)}
                                disabled={!isInternationalTravel}
                                className="h-4 w-4 rounded border-slate-300 accent-emerald-700 disabled:opacity-50"
                              />
                              Precisa de visto EUA
                            </label>
                          </div>
                          <textarea
                            value={travelNotes}
                            onChange={(event) => setTravelNotes(event.target.value)}
                            placeholder="Ex.: quantidade de dias, pernoite, hotel, deslocamento, rotina durante a viagem..."
                            className={requestTextareaClass(false)}
                          />
                        </div>
                      ) : null}
                    </div>
                    <CepAddressFields
                      value={{
                        postalCode,
                        addressLine,
                        addressNumber,
                        addressComplement,
                        neighborhood,
                        city,
                        state: stateCode
                      }}
                      onChange={updateRequestAddress}
                      requiredFields={{
                        postalCode: true,
                        addressLine: true,
                        addressNumber: true,
                        neighborhood: true,
                        city: true,
                        state: true
                      }}
                      invalidFields={{
                        postalCode: requestFieldErrors.postalCode,
                        addressLine: requestFieldErrors.addressLine,
                        addressNumber: requestFieldErrors.addressNumber,
                        neighborhood: requestFieldErrors.neighborhood,
                        city: requestFieldErrors.city,
                        state: requestFieldErrors.state
                      }}
                    />
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">
                      Observações de segurança
                      <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Ex.: preciso de banho assistido e transferencia segura cadeira-cama."
                        className={requestTextareaClass(false)}
                      />
                    </label>
                  </div>

                </div>

                <div className="grid gap-2 border-t border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-5">
                  {requestError ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 sm:col-span-2" role="alert">
                      {requestError}
                    </div>
                  ) : null}
                  {requestSent ? (
                    <div
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 sm:col-span-2"
                      role="status"
                      aria-live="polite"
                    >
                      {requestWarning || `Pedido enviado para ${selected.name}.`}
                      <span className="block pt-1 font-medium">
                        Aguarde a confirmação do profissional pelo painel e pelo e-mail informado.
                      </span>
                      <span className="block pt-1 font-medium">
                        Nesta versao, pagamento e detalhes finais sao combinados diretamente com o profissional.
                      </span>
                      {createdRequestId ? (
                        <Link
                          href={`/dashboard/atendimentos/${createdRequestId}#mensagens`}
                          className="mt-2 inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                        >
                          Abrir conversa do atendimento
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                  {requestReviewOpen && !requestSent ? (
                    <div className="max-h-[42vh] overflow-y-auto rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 sm:col-span-2">
                      <div className="flex items-start gap-2">
                        <ClipboardCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                        <div>
                          <p className="font-semibold text-slate-950">Revise antes de enviar</p>
                          <p className="mt-1 leading-6">
                            Confira os dados principais. Depois de confirmar, o pedido fica pendente até o profissional aceitar ou agendar.
                          </p>
                        </div>
                      </div>
                      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg bg-white/70 p-2">
                          <dt className="text-xs font-semibold uppercase text-emerald-700">Profissional</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{selected.name} - {selected.roleLabel}</dd>
                        </div>
                        <div className="rounded-lg bg-white/70 p-2">
                          <dt className="text-xs font-semibold uppercase text-emerald-700">Cuidado</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{currentServiceLabel} - {currentSupportLabel}</dd>
                        </div>
                        <div className="rounded-lg bg-white/70 p-2">
                          <dt className="text-xs font-semibold uppercase text-emerald-700">Data e horário</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{formatDateLabel(scheduledParts.date)} às {completedScheduledTime}</dd>
                        </div>
                        <div className="rounded-lg bg-white/70 p-2">
                          <dt className="text-xs font-semibold uppercase text-emerald-700">Duração</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{requestDurationSummary}</dd>
                        </div>
                        <div className="rounded-lg bg-white/70 p-2 sm:col-span-2">
                          <dt className="text-xs font-semibold uppercase text-emerald-700">Paciente e contato</dt>
                          <dd className="mt-1 font-semibold text-slate-950">
                            {requesterName.trim()} - {requesterPhone.trim()} - {requesterEmail.trim()}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-white/70 p-2 sm:col-span-2">
                          <dt className="text-xs font-semibold uppercase text-emerald-700">Endereço</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{requestAddressSummary}</dd>
                        </div>
                        <div className="rounded-lg bg-white/70 p-2">
                          <dt className="text-xs font-semibold uppercase text-emerald-700">Preferência no cuidado</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{currentGenderLabel}</dd>
                        </div>
                        <div className="rounded-lg bg-white/70 p-2">
                          <dt className="text-xs font-semibold uppercase text-emerald-700">Rotina fixa</dt>
                          <dd className="mt-1 font-semibold text-slate-950">
                            {fixedContractRequested ? "Paciente tem interesse" : "Não informado"}
                          </dd>
                        </div>
                        <div className="rounded-lg bg-white/70 p-2">
                          <dt className="text-xs font-semibold uppercase text-emerald-700">Pagamento</dt>
                          <dd className="mt-1 font-semibold text-slate-950">{CARE_REQUEST_PAYMENT_LABEL}</dd>
                        </div>
                      </dl>
                      {travelRequested ? (
                        <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-sky-950">
                          <p className="inline-flex items-center gap-2 font-semibold">
                            <Plane aria-hidden="true" className="h-4 w-4" />
                            Viagem: {travelDestination.trim()}
                          </p>
                          <p className="mt-1">
                            {isInternationalTravel ? "Viagem internacional" : "Viagem nacional/local"}
                            {needsUsVisa ? " - precisa de visto EUA" : ""}
                          </p>
                          {travelNotes.trim() ? <p className="mt-1">{travelNotes.trim()}</p> : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {!requestSent ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:col-span-2">
                      <p className="font-semibold text-slate-950">Regras do pedido</p>
                      <ul className="mt-2 grid gap-1 leading-5">
                        {careRequestRules.map((rule) => (
                          <li key={rule.title}>
                            <span className="font-semibold">{rule.title}:</span> {rule.detail}
                          </li>
                        ))}
                      </ul>
                      <label className="mt-3 flex items-start gap-3 rounded-lg bg-white p-3 font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={requestRulesAccepted}
                          onChange={(event) => setRequestRulesAccepted(event.target.checked)}
                          aria-invalid={requestFieldErrors.rulesAccepted ? "true" : undefined}
                          className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700"
                        />
                        <span>Li e entendi as regras do atendimento. {requiredMark()}</span>
                      </label>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    onClick={requestReviewOpen ? submitRequest : openRequestReview}
                    disabled={requestPending || requestSent || availabilityLoading || availableTimes.length === 0}
                    className={
                      requestSent
                        ? "h-12 gap-2 bg-emerald-50 text-emerald-800 shadow-none ring-1 ring-emerald-200 hover:bg-emerald-50 disabled:opacity-100"
                        : "h-12 gap-2 bg-emerald-700 hover:bg-emerald-800"
                    }
                  >
                    <CalendarClock aria-hidden="true" className="h-4 w-4" />
                    {requestSent ? "Pedido enviado" : requestPending ? "Enviando..." : requestReviewOpen ? "Confirmar e enviar" : "Revisar pedido"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={requestSent ? closeDetails : requestReviewOpen ? () => setRequestReviewOpen(false) : undefined}
                    className="h-12 gap-2"
                  >
                    {requestSent || requestReviewOpen ? <X aria-hidden="true" className="h-4 w-4" /> : <Phone aria-hidden="true" className="h-4 w-4" />}
                    {requestSent ? "Fechar" : requestReviewOpen ? "Editar dados" : "Ligar para triagem"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-600">Selecione um profissional para ver detalhes.</div>
            )}
          </aside>

          <aside
            className={
              reviewsProfessional
                ? "fixed inset-0 z-[2200] grid place-items-center overflow-hidden bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4"
                : "hidden"
            }
            role="dialog"
            aria-modal="true"
            aria-label="Avaliações do profissional"
          >
            {reviewsProfessional ? (
              <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                <button
                  type="button"
                  onClick={closeReviews}
                  className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-950"
                  aria-label="Fechar avaliações"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>

                <div className="overflow-y-auto p-4 sm:p-5">
                  <div className="flex items-start gap-4 pr-12">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {reviewsProfessional.photoUrl ? (
                        <Image src={reviewsProfessional.photoUrl} alt={reviewsProfessional.name} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-400">
                          <UserRound aria-hidden="true" className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-emerald-700">{reviewsProfessional.roleLabel}</p>
                      <h2 className="mt-1 text-2xl font-semibold text-slate-950">{reviewsProfessional.name}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-800">
                          <Star aria-hidden="true" className="h-4 w-4 fill-amber-500 text-amber-500" />
                          {formatRatingSummary(reviewsProfessional.rating, reviewsProfessional.reviewCount)}
                        </span>
                        {reviewsProfessional.isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-sm font-semibold text-emerald-800">
                            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                            Verificado
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    Avaliações ajudam a entender pontualidade, cuidado e comunicação. Elas não substituem combinados diretos antes do atendimento.
                  </div>

                  <div className="mt-4 grid gap-3">
                    {reviewsLoading ? (
                      <div className="rounded-lg border border-slate-200 p-4 text-sm font-semibold text-slate-600">Carregando avaliações...</div>
                    ) : null}
                    {reviewsError ? <div className="rounded-lg bg-rose-50 p-4 text-sm font-semibold text-rose-700">{reviewsError}</div> : null}
                    {!reviewsLoading && !reviewsError && reviewsList.length === 0 ? (
                      <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">Nenhuma avaliação publicada ainda.</div>
                    ) : null}
                    {reviewsList.map((review) => (
                      <article key={review.id} className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm text-slate-700">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-950">{review.reviewerName}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {new Date(review.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-semibold text-amber-800">
                            <Star aria-hidden="true" className="h-4 w-4 fill-amber-500 text-amber-500" />
                            {formatRatingValue(review.rating)}/5
                          </span>
                        </div>
                        <p className="mt-3 leading-6">{review.comment || "Avaliação sem comentário."}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 border-t border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-5">
                  <Button
                    type="button"
                    onClick={() => {
                      const professionalId = reviewsProfessional.id;
                      closeReviews();
                      selectProfessional(professionalId);
                    }}
                    className="h-12 gap-2 bg-slate-950 hover:bg-slate-800"
                  >
                    <UserRound aria-hidden="true" className="h-4 w-4" />
                    Ver detalhes
                  </Button>
                  <Button type="button" variant="secondary" onClick={closeReviews} className="h-12 gap-2">
                    <X aria-hidden="true" className="h-4 w-4" />
                    Fechar
                  </Button>
                </div>
              </div>
            ) : null}
          </aside>

          <aside
            className={
              inquiryProfessional
                ? "fixed inset-0 z-[2100] grid place-items-center overflow-hidden bg-slate-950/50 p-3 backdrop-blur-sm sm:p-4"
                : "hidden"
            }
            role="dialog"
            aria-modal="true"
            aria-label="Enviar mensagem ao profissional"
          >
            {inquiryProfessional ? (
              <div className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
                <button
                  type="button"
                  onClick={closeInquiry}
                  className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-950"
                  aria-label="Fechar mensagem"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>

                <div className="overflow-y-auto p-4 sm:p-5">
                  <div className="flex items-start gap-4 pr-12">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {inquiryProfessional.photoUrl ? (
                        <Image src={inquiryProfessional.photoUrl} alt={inquiryProfessional.name} fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-400">
                          <UserRound aria-hidden="true" className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-emerald-700">{inquiryProfessional.roleLabel}</p>
                      <h2 className="mt-1 text-2xl font-semibold text-slate-950">{inquiryProfessional.name}</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Tire uma dúvida antes de solicitar atendimento. Se você estiver logado, a conversa abre no painel depois do envio.
                      </p>
                    </div>
                  </div>

                  {inquirySent ? (
                    <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950" role="status" aria-live="polite">
                      <p className="font-semibold">Mensagem enviada para {inquiryProfessional.name}.</p>
                      <p className="mt-1">O profissional recebe esta conversa no painel e por e-mail, quando o e-mail estiver habilitado.</p>
                      {createdInquiryId ? (
                        <Link
                          href={`/dashboard/mensagens/${createdInquiryId}`}
                          className="mt-3 inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                        >
                          Abrir conversa no painel
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-3">
                      <label className="grid gap-1 text-sm font-semibold text-slate-700">
                        Seu nome
                        <input
                          value={inquiryName}
                          onChange={(event) => setInquiryName(event.target.value)}
                          placeholder="Nome de quem esta entrando em contato"
                          className={requestInputClass(false)}
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          E-mail
                          <input
                            value={inquiryEmail}
                            onChange={(event) => setInquiryEmail(event.target.value)}
                            placeholder="email@exemplo.com"
                            className={requestInputClass(false)}
                          />
                        </label>
                        <label className="grid gap-1 text-sm font-semibold text-slate-700">
                          Telefone
                          <input
                            value={inquiryPhone}
                            onChange={(event) => setInquiryPhone(event.target.value)}
                            placeholder="(51) 99999-0101"
                            className={requestInputClass(false)}
                          />
                        </label>
                      </div>
                      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={fixedContractRequested}
                          onChange={(event) => setFixedContractRequested(event.target.checked)}
                          disabled={!inquiryProfessional.acceptsFixedContract}
                          className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700 disabled:opacity-50"
                        />
                        <span>
                          Quero conversar sobre rotina fixa
                          <span className="block pt-1 text-sm font-normal leading-5 text-slate-600">
                            {inquiryProfessional.acceptsFixedContract
                              ? "Marque se sua dúvida é sobre contrato fixo, escala recorrente ou CLT."
                              : "Esse profissional não marcou disponibilidade para contrato fixo."}
                          </span>
                        </span>
                      </label>
                      <label className="grid gap-1 text-sm font-semibold text-slate-700">
                        Mensagem
                        <textarea
                          value={inquiryBody}
                          onChange={(event) => setInquiryBody(event.target.value)}
                          rows={5}
                          maxLength={1000}
                          placeholder="Ex.: Oi, gostaria de tirar uma dúvida sobre experiência com transferência, disponibilidade e valores antes de solicitar atendimento."
                          className={requestTextareaClass(false)}
                        />
                      </label>
                      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                        Esta etapa não agenda atendimento. Ela serve para alinhar dúvidas antes de abrir um pedido formal.
                        {hasAuthenticatedSession ? " Depois de enviar, você vai para a conversa no painel." : " Para acompanhar respostas no painel, entre ou crie sua conta."}
                      </p>
                      {inquiryError ? <div className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{inquiryError}</div> : null}
                    </div>
                  )}
                </div>

                <div className="grid gap-2 border-t border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-5">
                  {!inquirySent ? (
                    <Button
                      type="button"
                      onClick={submitInquiry}
                      disabled={inquiryPending}
                      className="h-12 gap-2 bg-emerald-700 hover:bg-emerald-800"
                    >
                      <MessageCircle aria-hidden="true" className="h-4 w-4" />
                      {inquiryPending ? "Enviando..." : "Enviar mensagem"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeInquiry}
                    className="h-12 gap-2"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                    Fechar
                  </Button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section id="seguranca" className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ClipboardCheck aria-hidden="true" className="h-6 w-6 text-emerald-700" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950">Pedido não confirmado automaticamente</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O profissional precisa aceitar ou agendar antes do paciente considerar o atendimento confirmado.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ShieldCheck aria-hidden="true" className="h-6 w-6 text-violet-700" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950">Documentos e dados no painel</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Documentos profissionais, pedidos, notificações e histórico ficam ligados aos perfis quando enviados.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <HeartHandshake aria-hidden="true" className="h-6 w-6 text-rose-700" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950">Combinados claros</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pagamento, deslocamento, viagem, pernoite e horas extras devem ser confirmados antes do atendimento.
          </p>
          <a href="/seguranca" className="mt-3 inline-flex text-sm font-semibold text-emerald-700">
            Ver regras completas
          </a>
        </div>
      </section>
    </div>
  );
}
