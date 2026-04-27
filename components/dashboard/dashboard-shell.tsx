"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Check, ClipboardList, FileBadge, UserRoundCheck, X } from "lucide-react";
import { CareDashboardData } from "@/types";

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
                  {request.addressLine}, {request.neighborhood}
                </p>
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
