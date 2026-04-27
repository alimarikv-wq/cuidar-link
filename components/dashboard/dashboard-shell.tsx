"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, ClipboardList, FileBadge, Save, UserRoundCheck, X } from "lucide-react";
import { CepAddressFields, type CepAddressValue } from "@/components/ui/cep-address-fields";
import { AvailabilitySlotData, CareDashboardData, CareServiceCode, ProfessionalSettingsData, TransferSupportCode } from "@/types";

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
  { value: "FORTALECIMENTO", label: "Fortalecimento" }
];

const supportOptions: Array<{ value: TransferSupportCode; label: string }> = [
  { value: "MODERADO", label: "Apoio moderado" },
  { value: "ALTO", label: "Apoio fisico alto" },
  { value: "DUPLA", label: "Duas pessoas" }
];

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
  "h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const statusStyles: Record<RequestStatus, string> = {
  RASCUNHO: "bg-slate-100 text-slate-700",
  ENVIADO: "bg-blue-50 text-blue-800",
  ACEITO: "bg-emerald-50 text-emerald-800",
  AGENDADO: "bg-violet-50 text-violet-800",
  CONCLUIDO: "bg-slate-950 text-white",
  CANCELADO: "bg-rose-50 text-rose-800"
};

const buttonStyles: Record<StatusAction["variant"], string> = {
  primary: "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800",
  secondary: "border-slate-300 bg-white text-slate-800 hover:border-slate-500",
  danger: "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
};

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
        <div className="grid gap-4 sm:grid-cols-2">
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

        <div className="grid gap-4">
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

export function DashboardShell({ dashboard }: { dashboard: CareDashboardData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const summaryCards = [
    { label: "Perfil", value: dashboard.summary.accountTypeLabel, icon: UserRoundCheck },
    { label: "Solicitacoes", value: String(dashboard.summary.requests), icon: ClipboardList },
    { label: "Agendados", value: String(dashboard.summary.scheduled), icon: CalendarCheck },
    { label: "Docs verificados", value: String(dashboard.summary.verifiedDocuments), icon: FileBadge }
  ];
  const isProfessional = dashboard.summary.accountType === "PROFESSIONAL";

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {dashboard.professionalSettings ? <ProfessionalProfileForm settings={dashboard.professionalSettings} /> : null}

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Atendimentos</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Solicitacoes recentes</h2>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">{dashboard.requests.length}</span>
        </div>

        <div className="mt-5 grid gap-3">
          {actionError ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{actionError}</div> : null}

          {dashboard.requests.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Nenhuma solicitacao ainda. Quando um atendimento for pedido, ele aparece aqui.
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
                {request.notes ? <p className="mt-2 text-sm leading-6 text-slate-600">{request.notes}</p> : null}
              </div>
              <div className="grid gap-3 text-sm text-slate-500 md:min-w-44 md:text-right">
                <span>
                  {request.scheduledFor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(request.scheduledFor)) : "A combinar"}
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
