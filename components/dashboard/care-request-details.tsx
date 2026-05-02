"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ClipboardList,
  Home,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  X
} from "lucide-react";
import { formatBrasiliaDateTime } from "@/lib/date-time";
import { CareRequestDetailsData } from "@/types";

type RequestStatus = "RASCUNHO" | "ENVIADO" | "ACEITO" | "AGENDADO" | "CONCLUIDO" | "CANCELADO";
type StatusAction = {
  label: string;
  status: RequestStatus;
  variant: "primary" | "secondary" | "danger";
};

const statusStyles: Record<RequestStatus, string> = {
  RASCUNHO: "bg-slate-100 text-slate-700",
  ENVIADO: "bg-blue-50 text-blue-800",
  ACEITO: "bg-emerald-50 text-emerald-800",
  AGENDADO: "bg-violet-50 text-violet-800",
  CONCLUIDO: "bg-slate-950 text-white",
  CANCELADO: "bg-rose-50 text-rose-800"
};

const actionStyles: Record<StatusAction["variant"], string> = {
  primary: "border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800",
  secondary: "border-slate-300 bg-white text-slate-800 hover:border-slate-500",
  danger: "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100"
};

function formatDurationHours(durationHours: number) {
  if (durationHours < 1) return `${Math.round(durationHours * 60)} min`;
  if (Number.isInteger(durationHours)) return durationHours === 1 ? "1 hora" : `${durationHours} horas`;

  const hours = Math.floor(durationHours);
  const minutes = Math.round((durationHours - hours) * 60);
  return `${hours}h${String(minutes).padStart(2, "0")}`;
}

function fullAddress(request: CareRequestDetailsData) {
  return [
    [request.addressLine, request.addressNumber].filter(Boolean).join(", "),
    request.addressComplement,
    request.neighborhood,
    request.city,
    request.state
  ]
    .filter(Boolean)
    .join(" - ");
}

function getRequestActions(request: CareRequestDetailsData): StatusAction[] {
  if (request.viewer.canActAsProfessional) {
    if (request.status === "ENVIADO") {
      return [
        { label: "Aceitar", status: "ACEITO", variant: "primary" },
        { label: "Agendar", status: "AGENDADO", variant: "secondary" },
        { label: "Recusar", status: "CANCELADO", variant: "danger" }
      ];
    }

    if (request.status === "ACEITO") {
      return [
        { label: "Agendar", status: "AGENDADO", variant: "primary" },
        { label: "Cancelar", status: "CANCELADO", variant: "danger" }
      ];
    }

    if (request.status === "AGENDADO") {
      return [
        { label: "Concluir", status: "CONCLUIDO", variant: "primary" },
        { label: "Cancelar", status: "CANCELADO", variant: "danger" }
      ];
    }
  }

  if (request.viewer.canCancelAsPatient && ["ENVIADO", "ACEITO", "AGENDADO"].includes(request.status)) {
    return [{ label: "Cancelar pedido", status: "CANCELADO", variant: "danger" }];
  }

  return [];
}

function guidanceFor(request: CareRequestDetailsData) {
  if (request.status === "CANCELADO") return "Este pedido foi cancelado. Combine um novo atendimento somente se ainda houver necessidade.";
  if (request.status === "CONCLUIDO") return "Este atendimento foi marcado como concluido.";

  if (request.viewer.canActAsProfessional) {
    if (request.status === "ENVIADO") return "Confira os dados do paciente e confirme se voce consegue atender neste horario e endereco.";
    if (request.status === "ACEITO") return "Pedido aceito. Use Agendar quando o horario estiver confirmado com o paciente.";
    if (request.status === "AGENDADO") return "Atendimento agendado. Apos realizar o cuidado, marque como concluido.";
  }

  if (request.status === "ENVIADO") return "Pedido enviado. Aguarde a resposta do profissional antes de considerar o atendimento confirmado.";
  if (request.status === "ACEITO") return "O profissional aceitou o pedido. Agora confirme os combinados de horario e seguranca.";
  if (request.status === "AGENDADO") return "Atendimento agendado. Mantenha telefone e e-mail acessiveis para qualquer ajuste.";

  return "Acompanhe aqui as atualizacoes deste atendimento.";
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value || "Nao informado"}</div>
    </div>
  );
}

export function CareRequestDetails({ request }: { request: CareRequestDetailsData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState("");
  const actions = getRequestActions(request);

  function updateStatus(nextStatus: RequestStatus) {
    setError("");
    setUpdatingStatus(nextStatus);

    startTransition(async () => {
      const response = await fetch(`/api/care-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel atualizar este atendimento.");
        setUpdatingStatus("");
        return;
      }

      router.refresh();
      setUpdatingStatus("");
    });
  }

  return (
    <section className="surface space-y-5">
      <Link href="/dashboard#atendimentos" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Voltar ao painel
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Atendimento</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{request.serviceLabel}</h1>
            <p className="mt-2 text-sm text-slate-600">
              {request.professional.name} - {request.professional.roleLabel}
            </p>
          </div>
          <span className={`rounded-lg px-3 py-1 text-sm font-semibold ${statusStyles[request.status as RequestStatus] || statusStyles.ENVIADO}`}>
            {request.statusLabel}
          </span>
        </div>

        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
          {guidanceFor(request)}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarClock aria-hidden="true" className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold text-slate-950">Horario e cuidado</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoRow label="Data e hora" value={request.scheduledFor ? formatBrasiliaDateTime(request.scheduledFor) : "A combinar"} />
              <InfoRow label="Duracao" value={formatDurationHours(request.durationHours)} />
              <InfoRow label="Apoio solicitado" value={request.supportNeedLabel} />
              <InfoRow label="Preferencia no cuidado" value={request.preferredGenderLabel} />
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Home aria-hidden="true" className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold text-slate-950">Endereco</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoRow label="Endereco completo" value={fullAddress(request)} />
              <InfoRow label="CEP" value={request.postalCode} />
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold text-slate-950">Observacoes de seguranca</h2>
            </div>
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {request.notes || "Nenhuma observacao informada."}
            </p>
          </article>
        </div>

        <aside className="space-y-5">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ClipboardList aria-hidden="true" className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold text-slate-950">Acoes</h2>
            </div>

            {error ? <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

            <div className="mt-4 grid gap-2">
              {actions.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  Nenhuma acao disponivel neste status.
                </p>
              ) : null}

              {actions.map((action) => (
                <button
                  key={action.status}
                  type="button"
                  onClick={() => updateStatus(action.status)}
                  disabled={isPending}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${actionStyles[action.variant]}`}
                >
                  {action.status === "CANCELADO" ? <X aria-hidden="true" className="h-4 w-4" /> : <Check aria-hidden="true" className="h-4 w-4" />}
                  {isPending && updatingStatus === action.status ? "Salvando..." : action.label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              Pagamento combinado diretamente entre paciente e profissional. A plataforma ainda nao processa pagamento online.
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <UserRound aria-hidden="true" className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold text-slate-950">Paciente</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <InfoRow label="Nome" value={request.patient.name} />
              <InfoRow
                label="Telefone"
                value={request.patient.phone ? <a href={`tel:${request.patient.phone}`} className="inline-flex items-center gap-1 text-emerald-700"><Phone aria-hidden="true" className="h-4 w-4" />{request.patient.phone}</a> : null}
              />
              <InfoRow
                label="E-mail"
                value={request.patient.email ? <a href={`mailto:${request.patient.email}`} className="inline-flex items-center gap-1 text-emerald-700"><Mail aria-hidden="true" className="h-4 w-4" />{request.patient.email}</a> : null}
              />
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <UserRound aria-hidden="true" className="h-5 w-5 text-emerald-700" />
              <h2 className="text-xl font-semibold text-slate-950">Profissional</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <InfoRow label="Nome" value={request.professional.name} />
              <InfoRow label="Perfil" value={`${request.professional.roleLabel} - ${request.professional.age} anos`} />
              <InfoRow
                label="Local"
                value={<span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="h-4 w-4 text-emerald-700" />{request.professional.neighborhood}, {request.professional.city}</span>}
              />
              <InfoRow label="Apoio fisico" value={request.professional.supportLevelLabel} />
              <InfoRow label="Experiencia" value={request.professional.bio} />
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
