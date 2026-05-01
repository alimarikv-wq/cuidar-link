"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarCheck,
  Check,
  CheckCheck,
  ClipboardList,
  FileBadge,
  FileUp,
  Heart,
  MapPin,
  Save,
  ShieldCheck,
  Star,
  UserRoundCheck,
  X
} from "lucide-react";
import { CepAddressFields, type CepAddressValue } from "@/components/ui/cep-address-fields";
import { formatCpf, isValidCpf } from "@/lib/cpf";
import { formatBrasiliaDateTime } from "@/lib/date-time";
import {
  AvailabilitySlotData,
  CareDashboardData,
  CareServiceCode,
  DashboardFavoriteProfessional,
  DocumentTypeCode,
  ProfessionalSettingsData,
  TransferSupportCode
} from "@/types";

type RequestStatus = "RASCUNHO" | "ENVIADO" | "ACEITO" | "AGENDADO" | "CONCLUIDO" | "CANCELADO";
type StatusAction = {
  label: string;
  status: RequestStatus;
  variant: "primary" | "secondary" | "danger";
};

const serviceOptions: Array<{ value: CareServiceCode; label: string }> = [
  { value: "BANHO", label: "Banho" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "MEDICACAO", label: "Medicacao" },
  { value: "CURATIVOS", label: "Curativos" },
  { value: "FISIOTERAPIA", label: "Fisioterapia" },
  { value: "COMPANHIA", label: "Companhia" },
  { value: "REFEICAO", label: "Refeicao" },
  { value: "SINAIS_VITAIS", label: "Sinais vitais" },
  { value: "AVALIACAO", label: "Avaliacao" },
  { value: "FORTALECIMENTO", label: "Fortalecimento" },
  { value: "OUTRO", label: "Outro" }
];

const publicSearchServiceCodes = new Set<CareServiceCode>(["BANHO", "TRANSFERENCIA", "MEDICACAO", "FISIOTERAPIA"]);

const supportOptions: Array<{ value: TransferSupportCode; label: string }> = [
  { value: "MODERADO", label: "Sem preferencia de porte fisico" },
  { value: "ALTO", label: "Porte fisico forte" },
  { value: "DUPLA", label: "Duas pessoas" }
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

function documentRequirementMatches(requirementType: DocumentTypeCode, documentType: DocumentTypeCode) {
  return requirementType === "RG" ? documentType === "RG" || documentType === "CNH" : requirementType === documentType;
}

function nextRequiredDocumentType(requiredDocuments: ProfessionalSettingsData["requiredDocuments"], currentType?: DocumentTypeCode) {
  const nextDocument = requiredDocuments.find((document) => {
    return (
      (document.status === "FALTANDO" || document.status === "RECUSADO") &&
      (!currentType || !documentRequirementMatches(document.type, currentType))
    );
  });

  return nextDocument?.type;
}

function documentRequirementText(status: ProfessionalSettingsData["requiredDocuments"][number]["status"]) {
  if (status === "FALTANDO") return "Faltando";
  if (status === "PENDENTE") return "Enviado";
  if (status === "VERIFICADO") return "Aprovado";
  return "Reenviar";
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

function getRequestActions(status: string, accountType: string): StatusAction[] {
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
        { label: "Concluir", status: "CONCLUIDO", variant: "primary" },
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

function ProfessionalProfileForm({ settings }: { settings: ProfessionalSettingsData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(settings);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/professional-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel salvar o perfil.");
        return;
      }

      setMessage("Perfil salvo.");
      router.refresh();
    });
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Perfil profissional</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Servicos, agenda e valores</h2>
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
            Telefone
            <input
              value={form.phone || ""}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className={fieldClass}
            />
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
          />
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Valor por hora
            <input
              type="number"
              min={1}
              value={form.hourlyRate}
              onChange={(event) => setForm((current) => ({ ...current, hourlyRate: Number(event.target.value) }))}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Valor por sessao
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
            Raio de atendimento
            <input
              type="number"
              min={1}
              max={50}
              value={form.serviceRadiusKm}
              onChange={(event) => setForm((current) => ({ ...current, serviceRadiusKm: Number(event.target.value) }))}
              className={fieldClass}
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
            <p className="text-sm font-semibold text-slate-700">Servicos</p>
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
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">Agenda semanal</p>
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
          </div>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-slate-700 lg:col-span-2">
          Experiencia
          <textarea
            value={form.bio}
            onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
            className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-slate-700 lg:col-span-2">
          Apoio em mobilidade
          <textarea
            value={form.mobilitySupport}
            onChange={(event) => setForm((current) => ({ ...current, mobilitySupport: event.target.value }))}
            className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
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
  const firstActionableDocument =
    settings.requiredDocuments.find((document) => document.status === "FALTANDO" || document.status === "RECUSADO") ||
    settings.requiredDocuments[0];
  const [type, setType] = useState<DocumentTypeCode>(firstActionableDocument?.type || "CPF");
  const [cpf, setCpf] = useState(settings.cpf ? formatCpf(settings.cpf) : "");
  const [documentNumber, setDocumentNumber] = useState(settings.professionalRegistrationNumber || "");
  const [registrationUf, setRegistrationUf] = useState(settings.professionalRegistrationUf || settings.state || "RS");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function readDocumentFile(nextFile: File | undefined) {
    setError("");
    setMessage("");
    setFile(null);
    setFileName("");

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

    setFile(nextFile);
    setFileName(nextFile.name);
  }

  function submitDocument() {
    setError("");
    setMessage("");

    const currentRequirement = settings.requiredDocuments.find((document) => documentRequirementMatches(document.type, type));
    if (currentRequirement && (currentRequirement.status === "PENDENTE" || currentRequirement.status === "VERIFICADO")) {
      setError(`${currentRequirement.label} ja foi enviado. Escolha outro documento obrigatorio ou aguarde a revisao.`);
      return;
    }

    if (!isValidCpf(cpf)) {
      setError("Informe um CPF valido.");
      return;
    }

    if ((type === "COREN" || type === "CREFITO") && (!documentNumber.trim() || registrationUf.trim().length !== 2)) {
      setError("Informe numero e UF do registro profissional.");
      return;
    }

    if (!file) {
      setError("Anexe uma imagem ou PDF do documento.");
      return;
    }

    if (!consentAccepted) {
      setError("Autorize o uso dos dados para validacao cadastral.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("cpf", cpf);
      formData.set("documentNumber", type === "CPF" ? cpf : documentNumber);
      formData.set("registrationUf", registrationUf);
      formData.set("expiresAt", expiresAt);
      formData.set("consentAccepted", String(consentAccepted));
      formData.set("file", file);

      const response = await fetch("/api/professional-documents", {
        method: "POST",
        body: formData
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel enviar o documento.");
        return;
      }

      setMessage("Seus documentos foram enviados e estao em analise. Voce sera notificado quando a validacao for concluida.");
      setExpiresAt("");
      setFile(null);
      setFileName("");
      setConsentAccepted(false);
      setDocumentNumber("");
      const nextType = nextRequiredDocumentType(settings.requiredDocuments, type);
      if (nextType) {
        setType(nextType);
      }
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

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {settings.requiredDocuments.map((document) => {
              const active = documentRequirementMatches(document.type, type);
              const locked = document.status === "PENDENTE" || document.status === "VERIFICADO";

              return (
                <button
                  key={document.type}
                  type="button"
                  onClick={() => setType(document.type)}
                  className={`grid min-h-16 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    active
                      ? "border-emerald-700 bg-emerald-50 text-emerald-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                  }`}
                >
                  <span className="font-semibold">{document.label}</span>
                  <span className={locked ? "text-slate-500" : "text-emerald-700"}>{documentRequirementText(document.status)}</span>
                </button>
              );
            })}
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
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Tipo de documento
              <select value={type} onChange={(event) => setType(event.target.value as DocumentTypeCode)} className={fieldClass}>
                {documentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Numero ou registro
              <input
                value={documentNumber}
                onChange={(event) => setDocumentNumber(event.target.value)}
                placeholder="Ex: COREN-RS 123456"
                className={fieldClass}
              />
            </label>
            {(type === "COREN" || type === "CREFITO") ? (
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                UF do registro
                <input
                  value={registrationUf}
                  onChange={(event) => setRegistrationUf(event.target.value.toUpperCase().slice(0, 2))}
                  placeholder="RS"
                  className={fieldClass}
                />
              </label>
            ) : null}
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Validade, se houver
              <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={fieldClass} />
            </label>
            <label className="grid gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-2">
                <FileUp aria-hidden="true" className="h-4 w-4 text-emerald-700" />
                Arquivo do documento
              </span>
              <input type="file" accept="image/*,.pdf" onChange={(event) => readDocumentFile(event.target.files?.[0])} className="text-sm" />
              {fileName ? <span className="text-sm font-medium text-emerald-700">{fileName}</span> : null}
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(event) => setConsentAccepted(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700"
              />
              <span>
                Autorizo o uso dos meus dados e documentos exclusivamente para fins de validacao profissional e cadastral na plataforma.
              </span>
            </label>
            <button
              type="button"
              onClick={submitDocument}
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
            >
              {isPending ? "Enviando..." : "Enviar documento"}
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
  onReadAll
}: {
  dashboard: CareDashboardData;
  pendingId: string;
  isPending: boolean;
  error: string;
  onRead: (notificationId: string) => void;
  onReadAll: () => void;
}) {
  return (
    <article id="notificacoes" className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Notificacoes</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Atualizacoes importantes</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {dashboard.summary.unreadNotifications} nao lidas
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
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-5 grid gap-3">
        {dashboard.notifications.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Nenhuma notificacao ainda. Quando houver novidades de atendimento ou verificacao, elas aparecem aqui.
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
                  {unread ? <span className="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white">Nova</span> : null}
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
                    disabled={pendingId === notification.id}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
                  >
                    {pendingId === notification.id ? "Salvando..." : "Marcar lida"}
                  </button>
                ) : null}
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
            Nenhum profissional salvo ainda. Use o coracao na busca para montar sua lista de referencia.
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
                <span>{professional.priceLabel}</span>
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
                Buscar horario
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
  const isProfessional = dashboard.summary.accountType === "PROFESSIONAL";
  const summaryCards = [
    { label: "Perfil", value: dashboard.summary.accountTypeLabel, icon: UserRoundCheck },
    { label: isProfessional ? "Solicitacoes" : "Pedidos", value: String(dashboard.summary.requests), icon: ClipboardList },
    { label: "Agendados", value: String(dashboard.summary.scheduled), icon: CalendarCheck },
    {
      label: "Notificacoes",
      value: String(dashboard.summary.unreadNotifications),
      icon: Bell
    },
    {
      label: isProfessional ? "Docs verificados" : "Favoritos",
      value: String(isProfessional ? dashboard.summary.verifiedDocuments : dashboard.summary.favoriteProfessionals),
      icon: isProfessional ? FileBadge : Heart
    }
  ];

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
        setActionError(data.error || "Nao foi possivel atualizar a solicitacao.");
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
        setFavoriteError(data.error || "Nao foi possivel remover o favorito.");
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
        setNotificationError(data.error || "Nao foi possivel atualizar a notificacao.");
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
        setNotificationError(data.error || "Nao foi possivel atualizar as notificacoes.");
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
        <p className="text-sm font-semibold text-emerald-700">Meu painel</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{dashboard.profile.name}</h1>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600">
          <span>{dashboard.profile.email}</span>
          {dashboard.profile.neighborhood ? <span>{dashboard.profile.neighborhood}</span> : null}
          {dashboard.profile.transferNeedLabel ? <span>{dashboard.profile.transferNeedLabel}</span> : null}
          {dashboard.profile.professionalTypeLabel ? <span>{dashboard.profile.professionalTypeLabel}</span> : null}
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

      <NotificationsPanel
        dashboard={dashboard}
        pendingId={readingNotificationId}
        isPending={isNotificationPending}
        error={notificationError}
        onRead={markNotificationRead}
        onReadAll={markAllNotificationsRead}
      />

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
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">
              {isProfessional ? "Solicitacoes recebidas" : "Pedidos enviados"}
            </h2>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{dashboard.requests.length}</span>
        </div>

        <div className="mt-5 grid gap-3">
          {actionError ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{actionError}</div> : null}

          {dashboard.requests.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {isProfessional
                ? "Nenhuma solicitacao ainda. Quando um atendimento for pedido, ele aparece aqui."
                : "Nenhum pedido enviado ainda. Quando voce solicitar atendimento, o status aparece aqui."}
            </div>
          ) : null}

          {dashboard.requests.map((request) => (
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
                <p className="mt-1 text-sm text-slate-500">Duracao: {formatDurationHours(request.durationHours)}</p>
                {request.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{request.notes}</p> : null}
              </div>
              <div className="grid gap-3 text-sm text-slate-500 md:min-w-44 md:text-right">
                <span>
                  {request.scheduledFor ? formatBrasiliaDateTime(request.scheduledFor) : "A combinar"}
                </span>
                {getRequestActions(request.status, dashboard.summary.accountType).length > 0 ? (
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {getRequestActions(request.status, dashboard.summary.accountType).map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        onClick={() => updateStatus(request.id, action.status)}
                        disabled={isPending && updatingId === request.id}
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
