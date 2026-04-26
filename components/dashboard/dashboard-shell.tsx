"use client";

import { CalendarCheck, ClipboardList, FileBadge, UserRoundCheck } from "lucide-react";
import { CareDashboardData } from "@/types";

export function DashboardShell({ dashboard }: { dashboard: CareDashboardData }) {
  const summaryCards = [
    { label: "Perfil", value: dashboard.summary.accountTypeLabel, icon: UserRoundCheck },
    { label: "Solicitacoes", value: String(dashboard.summary.requests), icon: ClipboardList },
    { label: "Agendados", value: String(dashboard.summary.scheduled), icon: CalendarCheck },
    { label: "Docs verificados", value: String(dashboard.summary.verifiedDocuments), icon: FileBadge }
  ];

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
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                    {request.statusLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {request.professionalName} - {request.professionalRole}
                </p>
                <p className="mt-1 text-sm text-slate-500">{request.neighborhood}</p>
              </div>
              <div className="text-sm text-slate-500 md:text-right">
                {request.scheduledFor ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(request.scheduledFor)) : "A combinar"}
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
