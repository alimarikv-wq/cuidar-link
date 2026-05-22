"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Bell,
  BriefcaseBusiness,
  CalendarCheck,
  Camera,
  Check,
  CheckCheck,
  ClipboardList,
  CreditCard,
  FileBadge,
  FileUp,
  Globe2,
  Heart,
  MapPin,
  MessageSquareText,
  Plane,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  UserRoundCheck,
  X
} from "lucide-react";
import { CepAddressFields, type CepAddressValue } from "@/components/ui/cep-address-fields";
import { formatCpf, isValidCpf } from "@/lib/cpf";
import { formatBrasiliaDateTime } from "@/lib/date-time";
import { inactiveSubscriptionCareAccessMessage, isSubscriptionUsable } from "@/lib/subscription-plans";
import {
  AvailabilitySlotData,
  CareDashboardData,
  CareRequestRecord,
  CareServiceCode,
  DashboardFavoriteProfessional,
  DocumentTypeCode,
  GenderPreferenceCode,
  PatientSettingsData,
  ProfileCompletionData,
  ProfessionalInquirySummary,
  ProfessionalSettingsData,
  TransferSupportCode
} from "@/types";

type RequestStatus = "RASCUNHO" | "ENVIADO" | "ACEITO" | "AGENDADO" | "CONCLUIDO" | "CANCELADO";
type StatusAction = {
  label: string;
  status: RequestStatus;
  variant: "primary" | "secondary" | "danger";
  disabledReason?: string | null;
};
type RequestView = "active" | "completed" | "canceled" | "archived";
type HistoryRange = "30" | "90" | "all" | "custom";

const serviceOptions: Array<{ value: CareServiceCode; label: string }> = [
  { value: "BANHO", label: "Banho" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "MEDICACAO", label: "Medicação" },
  { value: "CURATIVOS", label: "Curativos" },
  { value: "FISIOTERAPIA", label: "Fisioterapia" },
  { value: "COMPANHIA", label: "Companhia" },
  { value: "REFEICAO", label: "Refeição" },
  { value: "SINAIS_VITAIS", label: "Sinais vitais" },
  { value: "AVALIACAO", label: "Avaliação" },
  { value: "FORTALECIMENTO", label: "Fortalecimento" },
  { value: "OUTRO", label: "Outro" }
];

const publicSearchServiceCodes = new Set<CareServiceCode>(["BANHO", "TRANSFERENCIA", "MEDICACAO", "FISIOTERAPIA"]);

const supportOptions: Array<{ value: TransferSupportCode; label: string }> = [
  { value: "MODERADO", label: "Sem preferência de porte físico" },
  { value: "ALTO", label: "Porte físico forte" },
  { value: "DUPLA", label: "Duas pessoas" }
];

const genderPreferenceOptions: Array<{ value: GenderPreferenceCode; label: string }> = [
  { value: "QUALQUER", label: "Qualquer" },
  { value: "FEMININO", label: "Mulher" },
  { value: "MASCULINO", label: "Homem" }
];

const documentOptions: Array<{ value: DocumentTypeCode; label: string }> = [
  { value: "CPF", label: "CPF" },
  { value: "RG", label: "RG" },
  { value: "CNH", label: "CNH" },
  { value: "COMPROVANTE_RESIDENCIA", label: "Comprovante de residencia" },
  { value: "COREN", label: "COREN" },
  { value: "CREFITO", label: "CREFITO" },
  { value: "CERTIFICADO", label: "Certificado" },
  { value: "REFERENCIA", label: "Referencia" }
];

function documentRequirementText(status: ProfessionalSettingsData["requiredDocuments"][number]["status"]) {
  if (status === "FALTANDO") return "Faltando";
  if (status === "PENDENTE") return "Enviado";
  if (status === "VERIFICADO") return "Aprovado";
  return "Reenviar";
}

function isCouncilDocument(type: DocumentTypeCode) {
  return type === "COREN" || type === "CREFITO";
}

function cleanRegistrationNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 12);
}

function professionalRegistrationError(type: DocumentTypeCode, value: string) {
  if (!isCouncilDocument(type)) return "";

  const digits = cleanRegistrationNumber(value);
  if (digits.length < 4 || digits.length > 12) {
    return `${type} deve ter de 4 a 12 números.`;
  }

  return "";
}

const weekdayOptions = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sab" }
];

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";
const invalidFieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-rose-400 bg-rose-50/40 px-3 text-sm text-slate-950 outline-none transition focus:border-rose-600 focus:ring-2 focus:ring-rose-100";
const allowedProfilePhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxProfilePhotoSizeBytes = 3 * 1024 * 1024;

function inputClass(invalid?: boolean) {
  return invalid ? invalidFieldClass : fieldClass;
}

function requiredMark() {
  return <span className="text-rose-600" aria-label="obrigatório">*</span>;
}

function onlyDigits(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasValidPhone(value: string | null | undefined) {
  return onlyDigits(value).length >= 10;
}

function hasValidCep(value: string | null | undefined) {
  return onlyDigits(value).length === 8;
}

const addressRequiredFields: Partial<Record<keyof CepAddressValue, boolean>> = {
  postalCode: true,
  addressLine: true,
  addressNumber: true,
  neighborhood: true,
  city: true,
  state: true
};

const patientRequiredLabels: Record<string, string> = {
  name: "nome",
  phone: "telefone com DDD",
  postalCode: "CEP",
  addressLine: "endereço",
  addressNumber: "número",
  neighborhood: "bairro",
  city: "cidade",
  state: "UF"
};

const professionalRequiredLabels: Record<string, string> = {
  phone: "telefone",
  postalCode: "CEP",
  addressLine: "endereço",
  addressNumber: "número",
  neighborhood: "bairro",
  city: "cidade",
  state: "UF",
  serviceRadiusKm: "raio de atendimento",
  hourlyRate: "valor de referência por hora",
  services: "serviços",
  availability: "agenda semanal",
  bio: "experiência",
  mobilitySupport: "apoio em mobilidade"
};

function addressInvalidFields(missingFields: Set<string>, attempted: boolean): Partial<Record<keyof CepAddressValue, boolean>> {
  if (!attempted) return {};
  return {
    postalCode: missingFields.has("postalCode"),
    addressLine: missingFields.has("addressLine"),
    addressNumber: missingFields.has("addressNumber"),
    neighborhood: missingFields.has("neighborhood"),
    city: missingFields.has("city"),
    state: missingFields.has("state")
  };
}

function formatMissingMessage(missingFields: Set<string>, labels: Record<string, string>) {
  const missing = Array.from(missingFields).map((field) => labels[field]).filter(Boolean);
  return missing.length ? `Complete antes de salvar: ${missing.join(", ")}.` : "";
}

function getPatientMissingFields(form: PatientSettingsData) {
  const missing = new Set<string>();
  if (!hasText(form.name)) missing.add("name");
  if (!hasValidPhone(form.phone)) missing.add("phone");
  if (!hasValidCep(form.postalCode)) missing.add("postalCode");
  if (!hasText(form.addressLine)) missing.add("addressLine");
  if (!hasText(form.addressNumber)) missing.add("addressNumber");
  if (!hasText(form.neighborhood)) missing.add("neighborhood");
  if (!hasText(form.city)) missing.add("city");
  if (form.state?.trim().length !== 2) missing.add("state");
  return missing;
}

function getProfessionalMissingFields(form: ProfessionalSettingsData) {
  const missing = new Set<string>();
  if (!hasValidPhone(form.phone)) missing.add("phone");
  if (!hasValidCep(form.postalCode)) missing.add("postalCode");
  if (!hasText(form.addressLine)) missing.add("addressLine");
  if (!hasText(form.addressNumber)) missing.add("addressNumber");
  if (!hasText(form.neighborhood)) missing.add("neighborhood");
  if (!hasText(form.city)) missing.add("city");
  if (form.state?.trim().length !== 2) missing.add("state");
  if (!Number.isFinite(Number(form.serviceRadiusKm)) || Number(form.serviceRadiusKm) < 1) missing.add("serviceRadiusKm");
  if (!Number.isFinite(Number(form.hourlyRate)) || Number(form.hourlyRate) < 1) missing.add("hourlyRate");
  if (form.services.length === 0) missing.add("services");
  if (form.availability.length === 0) missing.add("availability");
  if (!hasText(form.bio)) missing.add("bio");
  if (!hasText(form.mobilitySupport)) missing.add("mobilitySupport");
  return missing;
}

const statusStyles: Record<RequestStatus, string> = {
  RASCUNHO: "bg-slate-100 text-slate-700",
  ENVIADO: "bg-blue-50 text-blue-800",
  ACEITO: "bg-emerald-50 text-emerald-800",
  AGENDADO: "bg-violet-50 text-violet-800",
  CONCLUIDO: "bg-slate-950 text-white",
  CANCELADO: "bg-rose-50 text-rose-800"
};

const documentStatusStyles: Record<string, string> = {
  FALTANDO: "bg-slate-100 text-slate-700",
  PENDENTE: "bg-amber-50 text-amber-900",
  VERIFICADO: "bg-emerald-50 text-emerald-800",
  RECUSADO: "bg-rose-50 text-rose-800"
};

const inquiryStatusStyles: Record<string, string> = {
  ABERTA: "bg-blue-50 text-blue-800",
  RESPONDIDA: "bg-emerald-50 text-emerald-800",
  ARQUIVADA: "bg-slate-100 text-slate-700"
};

const buttonStyles: Record<StatusAction["variant"], string> = {
  primary: "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800",
  secondary: "border-slate-300 bg-white text-slate-800 hover:border-slate-500",
  danger: "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
};

function favoriteSearchHref(professional: DashboardFavoriteProfessional) {
  const service = professional.serviceCodes.find((item) => publicSearchServiceCodes.has(item)) || "BANHO";
  const genderPreference = professional.gender === "OUTRO" ? "QUALQUER" : professional.gender;
  const params = new URLSearchParams({
    professionalId: professional.id,
    professionalType: professional.professionalType,
    service,
    genderPreference,
    supportNeed: professional.supportLevel,
    availability: "qualquer",
    radiusKm: "20"
  });

  return `/?${params.toString()}#busca`;
}

function formatDurationHours(durationHours: number) {
  if (durationHours < 1) return `${Math.round(durationHours * 60)} min`;
  if (Number.isInteger(durationHours)) return durationHours === 1 ? "1 hora" : `${durationHours} horas`;

  const hours = Math.floor(durationHours);
  const minutes = Math.round((durationHours - hours) * 60);
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function parseDateInput(value: string, endOfDay = false) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function validateProfilePhotoFile(file: File) {
  if (!allowedProfilePhotoTypes.has(file.type)) return "Envie uma foto JPG, JPEG, PNG ou WEBP.";
  if (file.size > maxProfilePhotoSizeBytes) return "Envie uma foto de até 3 MB.";
  return "";
}

function rangeStart(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days + 1);
  return date;
}

function filterRequestsByHistoryRange(
  requests: CareRequestRecord[],
  range: HistoryRange,
  startDate = "",
  endDate = ""
) {
  const start =
    range === "30" ? rangeStart(30) : range === "90" ? rangeStart(90) : range === "custom" ? parseDateInput(startDate) : null;
  const end = range === "custom" ? parseDateInput(endDate, true) : null;

  return requests.filter((request) => {
    const requestDate = new Date(request.scheduledFor || request.createdAt);
    if (Number.isNaN(requestDate.getTime())) return false;
    if (start && requestDate < start) return false;
    if (end && requestDate > end) return false;
    return true;
  });
}

function getRequestActions(request: CareRequestRecord, accountType: string): StatusAction[] {
  const status = request.status;

  if (accountType === "PROFESSIONAL") {
    if (status === "ENVIADO") {
      return [
        { label: "Aceitar", status: "ACEITO", variant: "primary" },
        { label: "Agendar", status: "AGENDADO", variant: "secondary" },
        { label: "Recusar", status: "CANCELADO", variant: "danger" }
      ];
    }

    if (status === "ACEITO") {
      return [
        { label: "Agendar", status: "AGENDADO", variant: "primary" },
        { label: "Cancelar", status: "CANCELADO", variant: "danger" }
      ];
    }

    if (status === "AGENDADO") {
      return [
        {
          label: "Concluir",
          status: "CONCLUIDO",
          variant: "primary",
          disabledReason: request.canCompleteNow ? null : request.completionGateLabel || "Conclusão ainda não liberada."
        },
        { label: "Cancelar", status: "CANCELADO", variant: "danger" }
      ];
    }

    return [];
  }

  if (["ENVIADO", "ACEITO", "AGENDADO"].includes(status)) {
    return [{ label: "Cancelar", status: "CANCELADO", variant: "danger" }];
  }

  return [];
}

function ProfileCompletionPanel({ completion, isProfessional }: { completion: ProfileCompletionData; isProfessional: boolean }) {
  const missingRequiredItems = completion.items.filter((item) => item.priority === "required" && !item.complete);
  const recommendedItems = completion.items.filter((item) => item.priority === "recommended");

  return (
    <article
      id="cadastro"
      className={`scroll-mt-24 rounded-lg border p-5 shadow-sm ${
        completion.complete ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/70"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className={`text-sm font-semibold ${completion.complete ? "text-emerald-800" : "text-amber-900"}`}>
            Cadastro
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {completion.complete ? "Cadastro pronto para usar" : "Complete seu cadastro para evitar retrabalho"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {completion.complete
              ? isProfessional
                ? "Seu perfil tem os dados essenciais para aparecer com segurança na busca e receber pedidos."
                : "Seu perfil tem os dados essenciais para preencher pedidos e conversar com profissionais."
              : "Quando esses dados ficam salvos aqui, os pedidos já saem com telefone, endereço e preferências corretas."}
          </p>
        </div>
        <div className="min-w-[140px] rounded-lg border border-white/70 bg-white p-3 text-center shadow-sm">
          <p className="text-3xl font-semibold text-slate-950">{completion.percent}%</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {completion.requiredMissingCount === 0 ? "essencial ok" : `${completion.requiredMissingCount} pendência(s)`}
          </p>
        </div>
      </div>

      {missingRequiredItems.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {missingRequiredItems.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className="rounded-lg border border-amber-200 bg-white p-3 text-sm transition hover:border-amber-400 hover:shadow-sm"
            >
              <span className="inline-flex items-center gap-2 font-semibold text-amber-950">
                <X aria-hidden="true" className="h-4 w-4 text-amber-700" />
                {item.label}
              </span>
              <span className="mt-1 block leading-5 text-slate-600">{item.detail}</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-3 text-sm font-semibold text-emerald-800">
          <Check aria-hidden="true" className="mr-2 inline h-4 w-4" />
          Dados obrigatórios completos.
        </div>
      )}

      {recommendedItems.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          {recommendedItems.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`rounded-lg border px-3 py-2 ${
                item.complete
                  ? "border-emerald-200 bg-white text-emerald-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
              }`}
            >
              {item.complete ? "Recomendado feito: " : "Recomendado: "}
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ProfilePhotoForm({ dashboard }: { dashboard: CareDashboardData }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState(dashboard.profile.photoUrl || "");
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previewUrl = localPreviewUrl || savedPhotoUrl;

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  function handleFileChange(nextFile: File | null) {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl("");
    }

    setFile(nextFile);
    setMessage("");
    setError("");

    if (!nextFile) return;

    const fileError = validateProfilePhotoFile(nextFile);
    if (fileError) {
      setFile(null);
      setError(fileError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setLocalPreviewUrl(URL.createObjectURL(nextFile));
  }

  function clearSelectedPhoto() {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl("");
    setFile(null);
    setError("");
    setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function submitPhoto() {
    if (!file) {
      setError("Escolha uma foto para enviar.");
      return;
    }

    setMessage("");
    setError("");

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile-photo", {
        method: "POST",
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Não foi possível enviar a foto.");
        return;
      }

      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl("");
      setSavedPhotoUrl(data.photoUrl);
      setFile(null);
      setMessage("Foto atualizada.");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <article id="foto-perfil" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-[96px_1fr_auto] md:items-center">
        <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={dashboard.profile.name} className="h-full w-full object-cover" />
          ) : (
            <Camera aria-hidden="true" className="h-8 w-8" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-emerald-700">Foto do perfil</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">Aumente a confiança no atendimento</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Envie uma foto clara. Profissionais aparecem com essa imagem na busca; pacientes usam no próprio painel.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handleFileChange(event.target.files?.[0] || null)}
              className="max-w-full text-sm text-slate-600 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:text-sm file:font-semibold file:text-slate-800"
            />
          </div>
          {file ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-sm text-emerald-900">
              <span className="font-semibold">{file.name}</span>
              <span>{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={clearSelectedPhoto}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-white px-2 text-xs font-semibold text-emerald-800 transition hover:border-emerald-400"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
                Trocar
              </button>
            </div>
          ) : null}
          {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}
          {error ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        </div>
        <button
          type="button"
          onClick={submitPhoto}
          disabled={isPending || !file}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Enviando..." : "Salvar foto"}
        </button>
      </div>
    </article>
  );
}

function PatientProfileForm({ settings }: { settings: PatientSettingsData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [attemptedSave, setAttemptedSave] = useState(false);
  const missingFields = getPatientMissingFields(form);
  const showInvalids = attemptedSave && missingFields.size > 0;

  function updateAddress(nextAddress: CepAddressValue) {
    setForm((current) => ({
      ...current,
      postalCode: nextAddress.postalCode,
      addressLine: nextAddress.addressLine,
      addressNumber: nextAddress.addressNumber,
      addressComplement: nextAddress.addressComplement,
      neighborhood: nextAddress.neighborhood,
      city: nextAddress.city,
      state: nextAddress.state
    }));
  }

  function saveProfile() {
    setAttemptedSave(true);
    setMessage("");
    setError("");

    const nextMissingFields = getPatientMissingFields(form);
    if (nextMissingFields.size > 0) {
      setError(formatMissingMessage(nextMissingFields, patientRequiredLabels));
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/patient-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone || "",
          addressLine: form.addressLine || "",
          addressNumber: form.addressNumber || "",
          addressComplement: form.addressComplement || "",
          postalCode: form.postalCode || "",
          city: form.city || "",
          state: form.state || "",
          approximateWeightKg: form.approximateWeightKg || null,
          mobilityNotes: form.mobilityNotes || ""
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Não foi possível salvar seus dados.");
        return;
      }

      setMessage("Dados do paciente salvos.");
      router.refresh();
    });
  }

  return (
    <article id="dados-paciente" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Perfil do paciente</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Dados de contato e atendimento</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Complete esses dados uma vez para a plataforma preencher pedidos, mensagens e endereços com menos retrabalho.
          </p>
        </div>
        <button
          type="button"
          onClick={saveProfile}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Salvando..." : "Salvar dados"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          <span>Nome {requiredMark()}</span>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            aria-invalid={showInvalids && missingFields.has("name") ? "true" : undefined}
            className={inputClass(showInvalids && missingFields.has("name"))}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          <span>Telefone com DDD {requiredMark()}</span>
          <input
            value={form.phone || ""}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder="(51) 99999-0101"
            aria-invalid={showInvalids && missingFields.has("phone") ? "true" : undefined}
            className={inputClass(showInvalids && missingFields.has("phone"))}
          />
        </label>

        <CepAddressFields
          className="lg:col-span-2"
          value={{
            postalCode: form.postalCode || "",
            addressLine: form.addressLine || "",
            addressNumber: form.addressNumber || "",
            addressComplement: form.addressComplement || "",
            neighborhood: form.neighborhood,
            city: form.city || "Porto Alegre",
            state: form.state || "RS"
          }}
          onChange={updateAddress}
          requiredFields={addressRequiredFields}
          invalidFields={addressInvalidFields(missingFields, showInvalids)}
        />

        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Preferência no cuidado íntimo
          <select
            value={form.preferredGender}
            onChange={(event) => setForm((current) => ({ ...current, preferredGender: event.target.value as GenderPreferenceCode }))}
            className={fieldClass}
          >
            {genderPreferenceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Porte físico desejado
          <select
            value={form.transferNeed}
            onChange={(event) => setForm((current) => ({ ...current, transferNeed: event.target.value as TransferSupportCode }))}
            className={fieldClass}
          >
            {supportOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Peso aproximado, se quiser informar
          <input
            type="number"
            min={1}
            max={400}
            value={form.approximateWeightKg ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, approximateWeightKg: event.target.value ? Number(event.target.value) : null }))
            }
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700 lg:col-span-2">
          Observações de mobilidade e segurança
          <textarea
            value={form.mobilityNotes || ""}
            onChange={(event) => setForm((current) => ({ ...current, mobilityNotes: event.target.value }))}
            placeholder="Ex.: uso cadeira de rodas, preciso de apoio para transferência, banho ou deslocamento."
            className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
    </article>
  );
}

function ProfessionalProfileForm({ settings }: { settings: ProfessionalSettingsData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [attemptedSave, setAttemptedSave] = useState(false);
  const missingFields = getProfessionalMissingFields(form);
  const showInvalids = attemptedSave && missingFields.size > 0;

  function toggleService(service: CareServiceCode) {
    setForm((current) => {
      const services = current.services.includes(service)
        ? current.services.filter((item) => item !== service)
        : [...current.services, service];

      return { ...current, services };
    });
  }

  function findSlot(weekday: number) {
    return form.availability.find((slot) => slot.weekday === weekday);
  }

  function toggleWeekday(weekday: number) {
    setForm((current) => {
      const exists = current.availability.some((slot) => slot.weekday === weekday);
      const availability = exists
        ? current.availability.filter((slot) => slot.weekday !== weekday)
        : [...current.availability, { weekday, startTime: "08:00", endTime: "18:00" }].sort((a, b) => a.weekday - b.weekday);

      return { ...current, availability };
    });
  }

  function updateSlot(weekday: number, field: keyof Pick<AvailabilitySlotData, "startTime" | "endTime">, value: string) {
    setForm((current) => ({
      ...current,
      availability: current.availability.map((slot) => (slot.weekday === weekday ? { ...slot, [field]: value } : slot))
    }));
  }

  function updateAddress(nextAddress: CepAddressValue) {
    setForm((current) => ({
      ...current,
      postalCode: nextAddress.postalCode,
      addressLine: nextAddress.addressLine,
      addressNumber: nextAddress.addressNumber,
      addressComplement: nextAddress.addressComplement,
      neighborhood: nextAddress.neighborhood,
      city: nextAddress.city,
      state: nextAddress.state
    }));
  }

  function saveProfile() {
    setAttemptedSave(true);
    setMessage("");
    setError("");

    const nextMissingFields = getProfessionalMissingFields(form);
    if (nextMissingFields.size > 0) {
      setError(formatMissingMessage(nextMissingFields, professionalRequiredLabels));
      return;
    }

    startTransition(async () => {
      const payload = {
        ...form,
        phone: form.phone || "",
        whatsappPhone: form.whatsappPhone || "",
        addressLine: form.addressLine || "",
        addressNumber: form.addressNumber || "",
        addressComplement: form.addressComplement || "",
        postalCode: form.postalCode || "",
        city: form.city || "",
        state: form.state || "",
        travelNotes: form.travelNotes || ""
      };

      const response = await fetch("/api/professional-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Não foi possível salvar o perfil.");
        return;
      }

      setMessage("Perfil salvo.");
      router.refresh();
    });
  }

  return (
    <article id="perfil-profissional" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Perfil profissional</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Serviços, agenda e valores internos</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Os valores abaixo ajudam na sua organização, mas não aparecem como preço público na busca. Para pacientes, o atendimento fica
            como sob consulta e deve ser combinado antes da confirmação.
          </p>
        </div>
        <button
          type="button"
          onClick={saveProfile}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Salvando..." : "Salvar perfil"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span>Telefone com DDD {requiredMark()}</span>
            <input
              value={form.phone || ""}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              aria-invalid={showInvalids && missingFields.has("phone") ? "true" : undefined}
              className={inputClass(showInvalids && missingFields.has("phone"))}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            WhatsApp público
            <input
              value={form.whatsappPhone || ""}
              onChange={(event) => setForm((current) => ({ ...current, whatsappPhone: event.target.value }))}
              placeholder="(51) 99999-0101"
              className={fieldClass}
            />
            <span className="text-xs font-medium text-slate-500">
              Preencha somente se quiser exibir o botão WhatsApp na busca pública.
            </span>
          </label>
          <CepAddressFields
            className="sm:col-span-2"
            value={{
              postalCode: form.postalCode || "",
              addressLine: form.addressLine || "",
              addressNumber: form.addressNumber || "",
              addressComplement: form.addressComplement || "",
              neighborhood: form.neighborhood,
              city: form.city || "Porto Alegre",
              state: form.state || "RS"
            }}
            onChange={updateAddress}
            requiredFields={addressRequiredFields}
            invalidFields={addressInvalidFields(missingFields, showInvalids)}
          />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span>Valor de referência por hora {requiredMark()}</span>
            <input
              type="number"
              min={1}
              value={form.hourlyRate}
              onChange={(event) => setForm((current) => ({ ...current, hourlyRate: Number(event.target.value) }))}
              aria-invalid={showInvalids && missingFields.has("hourlyRate") ? "true" : undefined}
              className={inputClass(showInvalids && missingFields.has("hourlyRate"))}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Valor de referência por sessão
            <input
              type="number"
              min={1}
              value={form.sessionRate ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, sessionRate: event.target.value ? Number(event.target.value) : null }))
              }
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span>Raio de atendimento {requiredMark()}</span>
            <input
              type="number"
              min={1}
              max={50}
              value={form.serviceRadiusKm}
              onChange={(event) => setForm((current) => ({ ...current, serviceRadiusKm: Number(event.target.value) }))}
              aria-invalid={showInvalids && missingFields.has("serviceRadiusKm") ? "true" : undefined}
              className={inputClass(showInvalids && missingFields.has("serviceRadiusKm"))}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Capacidade
            <select
              value={form.supportLevel}
              onChange={(event) => setForm((current) => ({ ...current, supportLevel: event.target.value as TransferSupportCode }))}
              className={fieldClass}
            >
              {supportOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid min-w-0 gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-700">Serviços {requiredMark()}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {serviceOptions.map((service) => {
                const active = form.services.includes(service.value);
                return (
                  <button
                    key={service.value}
                    type="button"
                    onClick={() => toggleService(service.value)}
                    className={`h-10 rounded-lg border px-2 text-sm font-semibold transition ${
                      active
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                    }`}
                  >
                    {service.label}
                  </button>
                );
              })}
            </div>
            {showInvalids && missingFields.has("services") ? (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                Selecione pelo menos um serviço.
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-start gap-3 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={form.acceptsTravel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    acceptsTravel: event.target.checked,
                    hasPassport: event.target.checked ? current.hasPassport : false,
                    hasUsVisa: event.target.checked ? current.hasUsVisa : false,
                    travelNotes: event.target.checked ? current.travelNotes || "" : ""
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700"
              />
              <span>
                Aceito acompanhar viagens
                <span className="block pt-1 text-sm font-normal leading-5 text-slate-600">
                  Use para pacientes que precisam de apoio em deslocamentos, eventos, consultas fora da cidade ou viagens.
                </span>
              </span>
            </label>

            {form.acceptsTravel ? (
              <div className="mt-3 grid gap-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.hasPassport}
                      onChange={(event) => setForm((current) => ({ ...current, hasPassport: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                    />
                    <Globe2 aria-hidden="true" className="h-4 w-4 text-sky-700" />
                    Tenho passaporte
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.hasUsVisa}
                      onChange={(event) => setForm((current) => ({ ...current, hasUsVisa: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                    />
                    <Plane aria-hidden="true" className="h-4 w-4 text-sky-700" />
                    Tenho visto EUA
                  </label>
                </div>
                <textarea
                  value={form.travelNotes || ""}
                  onChange={(event) => setForm((current) => ({ ...current, travelNotes: event.target.value }))}
                  placeholder="Ex.: aceito viagens nacionais, finais de semana, eventos ou consultas fora da cidade."
                  className="min-h-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-start gap-3 text-sm font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={form.acceptsFixedContract}
                onChange={(event) => setForm((current) => ({ ...current, acceptsFixedContract: event.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700"
              />
              <span>
                Tenho disponibilidade para rotina fixa
                <span className="block pt-1 text-sm font-normal leading-5 text-slate-600">
                  Use para pacientes que buscam escala recorrente, cuidador fixo, técnico fixo ou contratação CLT.
                </span>
              </span>
            </label>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">Agenda semanal {requiredMark()}</p>
            <div className="mt-2 grid gap-2">
              {weekdayOptions.map((weekday) => {
                const slot = findSlot(weekday.value);
                return (
                  <div key={weekday.value} className="grid grid-cols-[54px_1fr_1fr] items-center gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(slot)}
                        onChange={() => toggleWeekday(weekday.value)}
                        className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                      />
                      {weekday.label}
                    </label>
                    <input
                      type="time"
                      value={slot?.startTime || "08:00"}
                      disabled={!slot}
                      onChange={(event) => updateSlot(weekday.value, "startTime", event.target.value)}
                      className={fieldClass}
                    />
                    <input
                      type="time"
                      value={slot?.endTime || "18:00"}
                      disabled={!slot}
                      onChange={(event) => updateSlot(weekday.value, "endTime", event.target.value)}
                      className={fieldClass}
                    />
                  </div>
                );
              })}
            </div>
            {showInvalids && missingFields.has("availability") ? (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                Marque pelo menos um dia e horário disponível.
              </p>
            ) : null}
          </div>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-slate-700 lg:col-span-2">
          <span>Experiência {requiredMark()}</span>
          <textarea
            value={form.bio}
            onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
            aria-invalid={showInvalids && missingFields.has("bio") ? "true" : undefined}
            className={`min-h-24 rounded-lg border px-3 py-2 text-sm text-slate-950 outline-none transition ${
              showInvalids && missingFields.has("bio")
                ? "border-rose-400 bg-rose-50/40 focus:border-rose-600 focus:ring-2 focus:ring-rose-100"
                : "border-slate-300 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            }`}
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-slate-700 lg:col-span-2">
          <span>Apoio em mobilidade {requiredMark()}</span>
          <textarea
            value={form.mobilitySupport}
            onChange={(event) => setForm((current) => ({ ...current, mobilitySupport: event.target.value }))}
            aria-invalid={showInvalids && missingFields.has("mobilitySupport") ? "true" : undefined}
            className={`min-h-24 rounded-lg border px-3 py-2 text-sm text-slate-950 outline-none transition ${
              showInvalids && missingFields.has("mobilitySupport")
                ? "border-rose-400 bg-rose-50/40 focus:border-rose-600 focus:ring-2 focus:ring-rose-100"
                : "border-slate-300 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            }`}
          />
        </label>
      </div>

      {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
    </article>
  );
}

function ProfessionalDocumentsForm({ settings }: { settings: ProfessionalSettingsData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const actionableDocuments = settings.requiredDocuments.filter((document) => document.status === "FALTANDO" || document.status === "RECUSADO");
  const councilRequirement = actionableDocuments.find((document) => isCouncilDocument(document.type));
  const needsCouncilData = Boolean(councilRequirement);
  const [cpf, setCpf] = useState(settings.cpf ? formatCpf(settings.cpf) : "");
  const [documentNumber, setDocumentNumber] = useState(needsCouncilData ? settings.professionalRegistrationNumber || "" : "");
  const [registrationUf, setRegistrationUf] = useState(settings.professionalRegistrationUf || settings.state || "RS");
  const [expiresAt, setExpiresAt] = useState("");
  const [documentFiles, setDocumentFiles] = useState<Partial<Record<DocumentTypeCode, File>>>({});
  const [uploadTypes, setUploadTypes] = useState<Partial<Record<DocumentTypeCode, DocumentTypeCode>>>({});
  const [fileInputKey, setFileInputKey] = useState(0);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function actualUploadType(requirementType: DocumentTypeCode) {
    return uploadTypes[requirementType] || requirementType;
  }

  function readDocumentFile(requirementType: DocumentTypeCode, nextFile: File | undefined) {
    setError("");
    setMessage("");
    setDocumentFiles((current) => {
      const next = { ...current };
      delete next[requirementType];
      return next;
    });

    if (!nextFile) return;
    if (nextFile.size > 2_000_000) {
      setError("Envie um arquivo de ate 2 MB.");
      return;
    }

    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(nextFile.type)) {
      setError("Envie PDF, JPG, JPEG ou PNG.");
      return;
    }

    setDocumentFiles((current) => ({ ...current, [requirementType]: nextFile }));
  }

  function submitDocument() {
    setError("");
    setMessage("");

    if (!isValidCpf(cpf)) {
      setError("Informe um CPF valido.");
      return;
    }

    const selectedDocuments = actionableDocuments
      .map((document) => ({
        requirement: document,
        uploadType: actualUploadType(document.type),
        file: documentFiles[document.type]
      }))
      .filter((document): document is { requirement: ProfessionalSettingsData["requiredDocuments"][number]; uploadType: DocumentTypeCode; file: File } =>
        Boolean(document.file)
      );

    if (selectedDocuments.length === 0) {
      setError("Anexe pelo menos um documento antes de enviar.");
      return;
    }

    const selectedCouncilDocument = selectedDocuments.find((document) => isCouncilDocument(document.uploadType));
    const registrationError = selectedCouncilDocument ? professionalRegistrationError(selectedCouncilDocument.uploadType, documentNumber) : "";
    if (registrationError) {
      setError(registrationError);
      return;
    }

    if (selectedCouncilDocument && registrationUf.trim().length !== 2) {
      setError("Informe número e UF do registro profissional.");
      return;
    }

    if (!consentAccepted) {
      setError("Autorize o uso dos dados para validação cadastral.");
      return;
    }

    startTransition(async () => {
      for (const document of selectedDocuments) {
        const councilDocument = isCouncilDocument(document.uploadType);
        const formData = new FormData();
        formData.set("type", document.uploadType);
        formData.set("cpf", cpf);
        formData.set("documentNumber", document.uploadType === "CPF" ? cpf : councilDocument ? cleanRegistrationNumber(documentNumber) : "");
        formData.set("registrationUf", councilDocument ? registrationUf : "");
        formData.set("expiresAt", expiresAt);
        formData.set("consentAccepted", String(consentAccepted));
        formData.set("file", document.file);

        const response = await fetch("/api/professional-documents", {
          method: "POST",
          body: formData
        });
        const data = await response.json();

        if (!response.ok) {
          setError(`${document.requirement.label}: ${data.error || "Não foi possível enviar o documento."}`);
          router.refresh();
          return;
        }
      }

      setMessage(
        selectedDocuments.length === 1
          ? "Documento enviado e em análise. Você será notificado quando a validação for concluída."
          : "Documentos enviados e em análise. Você será notificado quando a validação for concluída."
      );
      setExpiresAt("");
      setDocumentFiles({});
      setConsentAccepted(false);
      setFileInputKey((current) => current + 1);
      router.refresh();
    });
  }

  return (
    <article id="documentos" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Verificacao</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Documentos profissionais</h2>
        </div>
        <ShieldCheck aria-hidden="true" className="h-6 w-6 text-emerald-700" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-700">Obrigatorios para liberar selo</p>
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-slate-500">Status do cadastro</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{settings.verificationStatusLabel}</p>
            {settings.verificationNote ? <p className="mt-2 text-sm text-slate-600">{settings.verificationNote}</p> : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.requiredDocuments.map((document) => (
              <span
                key={document.type}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${documentStatusStyles[document.status] || documentStatusStyles.FALTANDO}`}
              >
                {document.label}: {documentRequirementText(document.status)}
              </span>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-5 text-blue-900">
            Envie um arquivo por tipo para manter CPF, RG ou CNH, comprovante e registro profissional corretamente identificados.
            O número do registro aparece somente para COREN ou CREFITO.
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              CPF
              <input
                value={cpf}
                onChange={(event) => setCpf(formatCpf(event.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className={fieldClass}
              />
            </label>

            {needsCouncilData ? (
              <>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  Número do {councilRequirement?.type}
                  <input
                    value={documentNumber}
                    onChange={(event) => setDocumentNumber(cleanRegistrationNumber(event.target.value))}
                    placeholder={councilRequirement?.type === "COREN" ? "Ex: 123456" : "Ex: 256709756"}
                    inputMode="numeric"
                    className={fieldClass}
                  />
                  <span className="text-xs font-medium text-slate-500">Use apenas números, de 4 a 12 dígitos.</span>
                </label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">
                  UF do registro
                  <input
                    value={registrationUf}
                    onChange={(event) => setRegistrationUf(event.target.value.toUpperCase().slice(0, 2))}
                    placeholder="RS"
                    className={fieldClass}
                  />
                </label>
              </>
            ) : null}

            {needsCouncilData ? (
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                Validade do registro, se houver
                <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={fieldClass} />
              </label>
            ) : null}

            {actionableDocuments.length > 0 ? (
              <div className="grid gap-3">
                {actionableDocuments.map((document) => {
                  const uploadType = actualUploadType(document.type);
                  const selectedFile = documentFiles[document.type];

                  return (
                    <div key={document.type} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-950">{document.label}</p>
                          <p className="mt-1 text-sm text-slate-500">{documentRequirementText(document.status)}</p>
                        </div>
                        {document.type === "RG" ? (
                          <label className="grid gap-1 text-sm font-semibold text-slate-700">
                            Enviar como
                            <select
                              value={uploadType}
                              onChange={(event) =>
                                setUploadTypes((current) => ({
                                  ...current,
                                  [document.type]: event.target.value as DocumentTypeCode
                                }))
                              }
                              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-950 outline-none focus:border-emerald-600"
                            >
                              <option value="RG">RG</option>
                              <option value="CNH">CNH</option>
                            </select>
                          </label>
                        ) : null}
                      </div>
                      <label className="mt-3 grid gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-2">
                          <FileUp aria-hidden="true" className="h-4 w-4 text-emerald-700" />
                          Arquivo do {document.type === "RG" ? documentOptions.find((option) => option.value === uploadType)?.label : document.label}
                        </span>
                        <input
                          key={`${fileInputKey}-${document.type}-${uploadType}`}
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(event) => readDocumentFile(document.type, event.target.files?.[0])}
                          className="text-sm"
                        />
                        {selectedFile ? <span className="text-sm font-medium text-emerald-700">{selectedFile.name}</span> : null}
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
                Todos os documentos obrigatorios ja foram enviados ou aprovados. Se algum for recusado, ele reaparece aqui para reenvio.
              </div>
            )}

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(event) => setConsentAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700"
              />
              <span>
                Autorizo o uso dos meus dados e documentos exclusivamente para fins de validação profissional e cadastral na plataforma.
              </span>
            </label>
            <button
              type="button"
              onClick={submitDocument}
              disabled={isPending || actionableDocuments.length === 0}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
            >
              {isPending ? "Enviando..." : "Enviar documentos selecionados"}
            </button>
            {message ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}
            {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
          </div>
        </div>

        <div className="grid content-start gap-3">
          {settings.documents.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Nenhum documento enviado ainda.
            </div>
          ) : null}

          {settings.documents.map((document) => (
            <div key={document.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-950">{document.label}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {document.typeLabel}
                    {document.documentNumber ? ` - ${document.documentNumber}` : ""}
                  </p>
                </div>
                <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${documentStatusStyles[document.status]}`}>
                  {document.statusLabel}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {document.downloadUrl ? (
                  <a href={document.downloadUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700">
                    Abrir arquivo
                  </a>
                ) : null}
                {document.expiresAt ? <span className="text-slate-500">Validade {new Date(document.expiresAt).toLocaleDateString("pt-BR")}</span> : null}
              </div>
              {document.externalCheckMessage ? <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{document.externalCheckMessage}</p> : null}
              {document.reviewNote ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{document.reviewNote}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function NotificationsPanel({
  dashboard,
  pendingId,
  isPending,
  error,
  onRead,
  onReadAll,
  onArchive,
  onArchiveRead
}: {
  dashboard: CareDashboardData;
  pendingId: string;
  isPending: boolean;
  error: string;
  onRead: (notificationId: string) => void;
  onReadAll: () => void;
  onArchive: (notificationId: string) => void;
  onArchiveRead: () => void;
}) {
  const readCount = dashboard.notifications.filter((notification) => notification.readAt).length;

  return (
    <article id="notificacoes" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Notificações</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Atualizações importantes</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Novas ficam destacadas em verde. As lidas ficam brancas e podem ser arquivadas para limpar o painel.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {dashboard.summary.unreadNotifications} não lidas
          </span>
          <button
            type="button"
            onClick={onReadAll}
            disabled={isPending || dashboard.summary.unreadNotifications === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck aria-hidden="true" className="h-4 w-4" />
            Marcar lidas
          </button>
          <button
            type="button"
            onClick={onArchiveRead}
            disabled={isPending || readCount === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Archive aria-hidden="true" className="h-4 w-4" />
            Arquivar lidas
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-5 grid gap-3">
        {dashboard.notifications.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Nenhuma notificação ainda. Quando houver novidades de atendimento ou verificação, elas aparecem aqui.
          </div>
        ) : null}

        {dashboard.notifications.map((notification) => {
          const unread = !notification.readAt;

          return (
            <div
              key={notification.id}
              className={`grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto] ${
                unread ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Bell aria-hidden="true" className={`h-4 w-4 ${unread ? "text-emerald-700" : "text-slate-400"}`} />
                  <h3 className="font-semibold text-slate-950">{notification.title}</h3>
                  {unread ? (
                    <span className="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white">Nova</span>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">Lida</span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{notification.body}</p>
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  {formatBrasiliaDateTime(notification.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-2 md:justify-end">
                {notification.actionUrl ? (
                  <Link
                    href={notification.actionUrl}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-emerald-500"
                  >
                    Abrir
                  </Link>
                ) : null}
                {unread ? (
                  <button
                    type="button"
                    onClick={() => onRead(notification.id)}
                    disabled={isPending || pendingId === notification.id}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
                  >
                    {pendingId === notification.id ? "Salvando..." : "Marcar lida"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onArchive(notification.id)}
                  disabled={isPending || pendingId === notification.id}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-emerald-500 disabled:cursor-wait disabled:opacity-60"
                >
                  <Archive aria-hidden="true" className="h-3.5 w-3.5" />
                  {pendingId === notification.id ? "Arquivando..." : "Arquivar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function PatientFavoritesPanel({
  dashboard,
  removingId,
  error,
  onRemove
}: {
  dashboard: CareDashboardData;
  removingId: string;
  error: string;
  onRemove: (professionalId: string) => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Favoritos</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Profissionais salvos</h2>
        </div>
        <span className="rounded-lg bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700">
          {dashboard.favoriteProfessionals.length}
        </span>
      </div>

      {error ? <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-5 grid gap-3">
        {dashboard.favoriteProfessionals.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Nenhum profissional salvo ainda. Use o coração na busca para montar sua lista de referência.
          </div>
        ) : null}

        {dashboard.favoriteProfessionals.map((professional) => (
          <div key={professional.id} className="grid gap-4 rounded-lg border border-slate-200 p-4 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-emerald-700">{professional.roleLabel}</p>
                {professional.isVerified ? (
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">Verificado</span>
                ) : null}
              </div>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">{professional.name}</h3>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden="true" className="h-4 w-4 text-emerald-700" />
                  {professional.neighborhood}, {professional.city}
                </span>
                <span>Pagamento: {professional.priceLabel}</span>
                <span>{professional.availableIn}</span>
                <span className="inline-flex items-center gap-1">
                  <Star aria-hidden="true" className="h-4 w-4 text-amber-500" />
                  {professional.rating}/5 ({professional.reviewCount})
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {professional.services.slice(0, 4).map((service) => (
                  <span key={service} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {service}
                  </span>
                ))}
                <span className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800">
                  {professional.supportLevelLabel}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-start gap-2 lg:justify-end">
              <Link
                href={favoriteSearchHref(professional)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-700 bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Buscar horário
              </Link>
              <button
                type="button"
                onClick={() => onRemove(professional.id)}
                disabled={removingId === professional.id}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
              >
                {removingId === professional.id ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function ProfessionalInquiriesPanel({
  inquiries,
  isProfessional
}: {
  inquiries: ProfessionalInquirySummary[];
  isProfessional: boolean;
}) {
  const unreadCount = inquiries.reduce((total, inquiry) => total + inquiry.unreadCount, 0);

  return (
    <article id="mensagens-iniciais" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Mensagens</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {isProfessional ? "Dúvidas antes do pedido" : "Conversas antes do atendimento"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isProfessional
              ? "Pacientes podem tirar dúvidas antes de abrir uma solicitação formal."
              : "Use esta área para acompanhar dúvidas enviadas antes de agendar um atendimento."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {inquiries.length} conversa(s)
          </span>
          {unreadCount > 0 ? (
            <span className="rounded-lg bg-emerald-700 px-3 py-1 text-sm font-semibold text-white">
              {unreadCount} nova(s)
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {inquiries.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Nenhuma conversa inicial ainda. Quando alguem clicar em Mensagem na busca, ela aparece aqui.
          </div>
        ) : null}

        {inquiries.map((inquiry) => (
          <div
            key={inquiry.id}
            className={`grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto] ${
              inquiry.unreadCount > 0 ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-950">
                  {isProfessional ? inquiry.requesterName : inquiry.professionalName}
                </p>
                <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${inquiryStatusStyles[inquiry.status] || inquiryStatusStyles.ABERTA}`}>
                  {inquiry.statusLabel}
                </span>
                {inquiry.unreadCount > 0 ? (
                  <span className="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white">Nova</span>
                ) : null}
                {inquiry.fixedContractRequested ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                    <BriefcaseBusiness aria-hidden="true" className="h-3.5 w-3.5" />
                    Rotina fixa
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {isProfessional
                  ? [inquiry.requesterEmail, inquiry.requesterPhone].filter(Boolean).join(" - ") || "Contato informado na conversa"
                  : `${inquiry.professionalName} - ${inquiry.professionalRole}`}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{inquiry.lastMessage}</p>
              <p className="mt-2 text-xs font-semibold text-slate-400">
                Última mensagem: {formatBrasiliaDateTime(inquiry.lastMessageAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2 md:justify-end">
              <Link
                href={`/dashboard/mensagens/${inquiry.id}`}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-emerald-500"
              >
                <MessageSquareText aria-hidden="true" className="h-3.5 w-3.5" />
                Abrir conversa
              </Link>
              {!isProfessional ? (
                <Link
                  href="/#busca"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800"
                >
                  Buscar atendimento
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function SubscriptionStatusPanel({ dashboard }: { dashboard: CareDashboardData }) {
  const isPremium = dashboard.subscription.tier === "PREMIUM";
  const hasMarketplaceAccess = dashboard.summary.accountType === "PROFESSIONAL" || isSubscriptionUsable(dashboard.subscription.status);
  const statusStyle =
    dashboard.subscription.status === "ATIVO" || dashboard.subscription.status === "TRIAL"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : dashboard.subscription.status === "CANCELADO"
        ? "bg-amber-50 text-amber-900 ring-amber-100"
        : "bg-rose-50 text-rose-800 ring-rose-100";
  const billingDates = [
    dashboard.subscription.startedAt ? { label: "Inicio", value: formatBrasiliaDateTime(dashboard.subscription.startedAt) } : null,
    dashboard.subscription.trialEndsAt ? { label: "Teste até", value: formatBrasiliaDateTime(dashboard.subscription.trialEndsAt) } : null,
    dashboard.subscription.renewsAt ? { label: "Renova em", value: formatBrasiliaDateTime(dashboard.subscription.renewsAt) } : null,
    dashboard.subscription.canceledAt ? { label: "Cancelado em", value: formatBrasiliaDateTime(dashboard.subscription.canceledAt) } : null
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Plano</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Assinatura da plataforma</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{dashboard.subscription.description}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-950">{dashboard.subscription.label}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle}`}>
              {dashboard.subscription.statusLabel}
            </span>
          </div>
          <p className="mt-1 text-slate-600">{dashboard.subscription.priceLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{dashboard.subscription.providerLabel}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
          {dashboard.subscription.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link
          href={dashboard.subscription.ctaHref}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
            isPremium
              ? "bg-emerald-700 text-white hover:bg-emerald-800"
              : "border border-slate-300 bg-white text-slate-800 hover:border-emerald-500"
          }`}
        >
          <CreditCard aria-hidden="true" className="h-4 w-4" />
          {dashboard.subscription.ctaLabel}
        </Link>
      </div>
      {!hasMarketplaceAccess ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
          {inactiveSubscriptionCareAccessMessage}
        </div>
      ) : null}
      {billingDates.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {billingDates.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase text-slate-500">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function DashboardShell({ dashboard }: { dashboard: CareDashboardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isNotificationPending, startNotificationTransition] = useTransition();
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [favoriteError, setFavoriteError] = useState("");
  const [removingFavoriteId, setRemovingFavoriteId] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [readingNotificationId, setReadingNotificationId] = useState("");
  const [requestView, setRequestView] = useState<RequestView>("active");
  const [historyRange, setHistoryRange] = useState<HistoryRange>("30");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const isProfessional = dashboard.summary.accountType === "PROFESSIONAL";
  const completedRequests = dashboard.recentRequests.filter((request) => request.status === "CONCLUIDO");
  const canceledRequests = dashboard.recentRequests.filter((request) => request.status === "CANCELADO");
  const historySource =
    requestView === "completed"
      ? completedRequests
      : requestView === "canceled"
        ? canceledRequests
        : requestView === "archived"
          ? dashboard.archivedRequests
          : [];
  const visibleHistoryRequests = filterRequestsByHistoryRange(
    historySource,
    historyRange,
    historyStartDate,
    historyEndDate
  );
  const visibleRequests = requestView === "active" ? dashboard.requests : visibleHistoryRequests;
  const requestViewTitle =
    requestView === "active"
      ? isProfessional
        ? "Solicitações ativas"
        : "Pedidos em andamento"
      : requestView === "completed"
        ? "Atendimentos concluídos"
        : requestView === "canceled"
          ? "Atendimentos cancelados"
          : "Atendimentos arquivados";
  const requestViewEmpty =
    requestView === "active"
      ? isProfessional
        ? "Nenhuma solicitação ativa agora. Quando um atendimento for pedido, ele aparece aqui."
        : "Nenhum pedido em andamento agora. Quando você solicitar atendimento, o status aparece aqui."
      : requestView === "completed"
        ? "Nenhum atendimento concluído nesse período."
        : requestView === "canceled"
          ? "Nenhum atendimento cancelado nesse período."
          : "Nenhum atendimento arquivado nesse período.";
  const requestTabs: Array<{ key: RequestView; label: string; count: number }> = [
    { key: "active", label: "Ativos", count: dashboard.requests.length },
    { key: "completed", label: "Concluidos", count: completedRequests.length },
    { key: "canceled", label: "Cancelados", count: canceledRequests.length },
    { key: "archived", label: "Arquivados", count: dashboard.archivedRequests.length }
  ];
  const summaryCards = [
    { label: "Perfil", value: dashboard.summary.accountTypeLabel, icon: UserRoundCheck },
    { label: isProfessional ? "Solicitações" : "Pedidos", value: String(dashboard.summary.requests), icon: ClipboardList },
    { label: "Agendados", value: String(dashboard.summary.scheduled), icon: CalendarCheck },
    {
      label: "Notificações",
      value: String(dashboard.summary.unreadNotifications),
      icon: Bell
    },
    {
      label: isProfessional ? "Docs verificados" : "Favoritos",
      value: String(isProfessional ? dashboard.summary.verifiedDocuments : dashboard.summary.favoriteProfessionals),
      icon: isProfessional ? FileBadge : Heart
    }
  ];

  useEffect(() => {
    function canRefreshDashboard() {
      if (document.visibilityState === "hidden") return false;
      const activeElement = document.activeElement;
      return !(
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement
      );
    }

    function refreshDashboard() {
      if (canRefreshDashboard()) router.refresh();
    }

    const interval = window.setInterval(refreshDashboard, 15000);
    window.addEventListener("focus", refreshDashboard);
    document.addEventListener("visibilitychange", refreshDashboard);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshDashboard);
      document.removeEventListener("visibilitychange", refreshDashboard);
    };
  }, [router]);

  function updateStatus(requestId: string, nextStatus: RequestStatus) {
    setActionError("");
    setUpdatingId(requestId);

    startTransition(async () => {
      const response = await fetch(`/api/care-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || "Não foi possível atualizar a solicitação.");
        setUpdatingId("");
        return;
      }

      router.refresh();
      setUpdatingId("");
    });
  }

  function archiveRequest(requestId: string) {
    setActionError("");
    setUpdatingId(requestId);

    startTransition(async () => {
      const response = await fetch(`/api/care-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true })
      });
      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || "Não foi possível arquivar o atendimento.");
        setUpdatingId("");
        return;
      }

      router.refresh();
      setUpdatingId("");
    });
  }

  function restoreRequest(requestId: string) {
    setActionError("");
    setUpdatingId(requestId);

    startTransition(async () => {
      const response = await fetch(`/api/care-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: false })
      });
      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || "Não foi possível restaurar o atendimento.");
        setUpdatingId("");
        return;
      }

      router.refresh();
      setUpdatingId("");
    });
  }

  function deleteRequestFromHistory(requestId: string) {
    const confirmed = window.confirm(
      "Você tem certeza que quer excluir este atendimento do seu histórico? Ele não vai aparecer mais para você. Esta ação não cancela atendimento nem apaga o registro administrativo da plataforma."
    );

    if (!confirmed) return;

    setActionError("");
    setUpdatingId(requestId);

    startTransition(async () => {
      const response = await fetch(`/api/care-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteFromHistory: true })
      });
      const data = await response.json();

      if (!response.ok) {
        setActionError(data.error || "Não foi possível excluir o atendimento do histórico.");
        setUpdatingId("");
        return;
      }

      router.refresh();
      setUpdatingId("");
    });
  }

  function removeFavorite(professionalId: string) {
    setFavoriteError("");
    setRemovingFavoriteId(professionalId);

    startTransition(async () => {
      const response = await fetch("/api/professional-favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professionalId })
      });
      const data = await response.json();

      if (!response.ok) {
        setFavoriteError(data.error || "Não foi possível remover o favorito.");
        setRemovingFavoriteId("");
        return;
      }

      router.refresh();
      setRemovingFavoriteId("");
    });
  }

  function markNotificationRead(notificationId: string) {
    setNotificationError("");
    setReadingNotificationId(notificationId);

    startNotificationTransition(async () => {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId })
      });
      const data = await response.json();

      if (!response.ok) {
        setNotificationError(data.error || "Não foi possível atualizar a notificação.");
        setReadingNotificationId("");
        return;
      }

      router.refresh();
      setReadingNotificationId("");
    });
  }

  function markAllNotificationsRead() {
    setNotificationError("");
    setReadingNotificationId("all");

    startNotificationTransition(async () => {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readAll: true })
      });
      const data = await response.json();

      if (!response.ok) {
        setNotificationError(data.error || "Não foi possível atualizar as notificações.");
        setReadingNotificationId("");
        return;
      }

      router.refresh();
      setReadingNotificationId("");
    });
  }

  function archiveNotification(notificationId: string) {
    setNotificationError("");
    setReadingNotificationId(notificationId);

    startNotificationTransition(async () => {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveId: notificationId })
      });
      const data = await response.json();

      if (!response.ok) {
        setNotificationError(data.error || "Não foi possível arquivar a notificação.");
        setReadingNotificationId("");
        return;
      }

      router.refresh();
      setReadingNotificationId("");
    });
  }

  function archiveReadNotifications() {
    setNotificationError("");
    setReadingNotificationId("archive-read");

    startNotificationTransition(async () => {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveRead: true })
      });
      const data = await response.json();

      if (!response.ok) {
        setNotificationError(data.error || "Não foi possível arquivar as notificações lidas.");
        setReadingNotificationId("");
        return;
      }

      router.refresh();
      setReadingNotificationId("");
    });
  }

  return (
    <section className="surface space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
            {dashboard.profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dashboard.profile.photoUrl} alt={dashboard.profile.name} className="h-full w-full object-cover" />
            ) : (
              <Camera aria-hidden="true" className="h-8 w-8" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">Meu painel</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{dashboard.profile.name}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
              <span>{dashboard.profile.email}</span>
              {dashboard.profile.neighborhood ? <span>{dashboard.profile.neighborhood}</span> : null}
              {dashboard.profile.transferNeedLabel ? <span>{dashboard.profile.transferNeedLabel}</span> : null}
              {dashboard.profile.professionalTypeLabel ? <span>{dashboard.profile.professionalTypeLabel}</span> : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-500">{card.label}</p>
                <Icon aria-hidden="true" className="h-5 w-5 text-emerald-700" />
              </div>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</h2>
            </article>
          );
        })}
      </div>

      <ProfileCompletionPanel completion={dashboard.profileCompletion} isProfessional={isProfessional} />

      <ProfilePhotoForm dashboard={dashboard} />

      {!isProfessional && dashboard.patientSettings ? <PatientProfileForm settings={dashboard.patientSettings} /> : null}

      <SubscriptionStatusPanel dashboard={dashboard} />

      <NotificationsPanel
        dashboard={dashboard}
        pendingId={readingNotificationId}
        isPending={isNotificationPending}
        error={notificationError}
        onRead={markNotificationRead}
        onReadAll={markAllNotificationsRead}
        onArchive={archiveNotification}
        onArchiveRead={archiveReadNotifications}
      />

      <ProfessionalInquiriesPanel inquiries={dashboard.inquiries} isProfessional={isProfessional} />

      {!isProfessional ? (
        <PatientFavoritesPanel
          dashboard={dashboard}
          removingId={removingFavoriteId}
          error={favoriteError}
          onRemove={removeFavorite}
        />
      ) : null}

      {dashboard.professionalSettings ? <ProfessionalProfileForm settings={dashboard.professionalSettings} /> : null}
      {dashboard.professionalSettings ? <ProfessionalDocumentsForm settings={dashboard.professionalSettings} /> : null}

      <article id="atendimentos" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Atendimentos</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">{requestViewTitle}</h2>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{visibleRequests.length}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {requestTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setRequestView(item.key)}
              className={`inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${
                requestView === item.key
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-slate-300 bg-white text-slate-800 hover:border-emerald-500"
              }`}
            >
              {item.label} ({item.count})
            </button>
          ))}
        </div>

        {requestView !== "active" ? (
          <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "30" as const, label: "Ultimos 30 dias" },
                { key: "90" as const, label: "Ultimos 3 meses" },
                { key: "all" as const, label: "Todos" },
                { key: "custom" as const, label: "Escolher periodo" }
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setHistoryRange(item.key)}
                  className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${
                    historyRange === item.key
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-300 bg-white text-slate-800 hover:border-slate-500"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {historyRange === "custom" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Inicio
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(event) => setHistoryStartDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Fim
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(event) => setHistoryEndDate(event.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          {actionError ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{actionError}</div> : null}

          {visibleRequests.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {requestViewEmpty}
            </div>
          ) : null}

          {visibleRequests.map((request) => (
            <div key={request.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-950">{request.serviceLabel}</p>
                  <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${statusStyles[request.status as RequestStatus] || statusStyles.ENVIADO}`}>
                    {request.statusLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {isProfessional
                    ? `Paciente: ${request.requesterName}`
                    : `${request.professionalName} - ${request.professionalRole}`}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {[request.addressLine, request.addressNumber].filter(Boolean).join(", ")} - {request.neighborhood}
                </p>
                {request.addressComplement ? <p className="mt-1 text-sm text-slate-500">{request.addressComplement}</p> : null}
                {request.requesterPhone ? <p className="mt-1 text-sm text-slate-500">Telefone: {request.requesterPhone}</p> : null}
                <p className="mt-1 text-sm text-slate-500">Duração: {formatDurationHours(request.durationHours)}</p>
                <p className="mt-1 text-sm text-slate-500">{request.paymentAgreementLabel}</p>
                {request.fixedContractRequested ? (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                    <BriefcaseBusiness aria-hidden="true" className="h-4 w-4" />
                    Interesse em rotina fixa/contrato fixo
                  </div>
                ) : null}
                {request.travelRequested ? (
                  <div className="mt-2 rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
                    <p className="inline-flex items-center gap-2 font-semibold">
                      <Plane aria-hidden="true" className="h-4 w-4" />
                      Acompanhamento em viagem
                    </p>
                    <p>Destino: {request.travelDestination || "Não informado"}</p>
                    <p>{request.isInternationalTravel ? "Viagem internacional" : "Viagem nacional ou local"}{request.needsUsVisa ? " - visto EUA necessario" : ""}</p>
                    {request.travelNotes ? <p>{request.travelNotes}</p> : null}
                  </div>
                ) : null}
                {request.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{request.notes}</p> : null}
              </div>
              <div className="grid gap-3 text-sm text-slate-500 md:min-w-44 md:text-right">
                <span>
                  {request.scheduledFor ? formatBrasiliaDateTime(request.scheduledFor) : "A combinar"}
                </span>
                {request.archivedAt ? (
                  <span className="text-xs text-slate-400">
                    Arquivado em {formatBrasiliaDateTime(request.archivedAt)}
                  </span>
                ) : null}
                <Link
                  href={`/dashboard/atendimentos/${request.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-emerald-500 md:justify-self-end"
                >
                  Ver detalhes
                </Link>
                <Link
                  href={`/dashboard/atendimentos/${request.id}#mensagens`}
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-emerald-500 md:justify-self-end"
                >
                  <MessageSquareText aria-hidden="true" className="h-3.5 w-3.5" />
                  Mensagens
                </Link>
                {request.archivedAt ? (
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => restoreRequest(request.id)}
                      disabled={isPending && updatingId === request.id}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-emerald-500 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Archive aria-hidden="true" className="h-3.5 w-3.5" />
                      {isPending && updatingId === request.id ? "Restaurando..." : "Restaurar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRequestFromHistory(request.id)}
                      disabled={isPending && updatingId === request.id}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                      {isPending && updatingId === request.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                ) : ["CONCLUIDO", "CANCELADO"].includes(request.status) ? (
                  <button
                    type="button"
                    onClick={() => archiveRequest(request.id)}
                    disabled={isPending && updatingId === request.id}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 transition hover:border-emerald-500 disabled:cursor-wait disabled:opacity-60 md:justify-self-end"
                  >
                    <Archive aria-hidden="true" className="h-3.5 w-3.5" />
                    {isPending && updatingId === request.id ? "Arquivando..." : "Arquivar"}
                  </button>
                ) : null}
                {request.status === "AGENDADO" && isProfessional && request.completionGateLabel ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-semibold leading-5 text-amber-900 md:text-left">
                    {request.completionGateLabel}
                  </p>
                ) : null}
                {getRequestActions(request, dashboard.summary.accountType).length > 0 ? (
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {getRequestActions(request, dashboard.summary.accountType).map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        onClick={() => updateStatus(request.id, action.status)}
                        disabled={(isPending && updatingId === request.id) || Boolean(action.disabledReason)}
                        title={action.disabledReason || undefined}
                        className={`inline-flex h-9 items-center justify-center gap-1 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${buttonStyles[action.variant]}`}
                      >
                        {action.status === "CANCELADO" ? <X aria-hidden="true" className="h-3.5 w-3.5" /> : <Check aria-hidden="true" className="h-3.5 w-3.5" />}
                        {isPending && updatingId === request.id ? "Salvando..." : action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
