"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  CalendarClock,
  Check,
  ClipboardList,
  Home,
  Mail,
  MapPin,
  Phone,
  Plane,
  ShieldCheck,
  Star,
  Trash2,
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
  if (request.archivedAt) return "Este atendimento esta arquivado no seu historico. Voce pode restaurar se quiser acompanhar novamente no painel.";
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

const statusRanks: Record<RequestStatus, number> = {
  RASCUNHO: 0,
  ENVIADO: 1,
  ACEITO: 2,
  AGENDADO: 3,
  CONCLUIDO: 4,
  CANCELADO: 5
};

function TimelineItem({
  done,
  active,
  label,
  description,
  date
}: {
  done: boolean;
  active: boolean;
  label: string;
  description: string;
  date?: string | null;
}) {
  return (
    <div className="relative grid gap-1 pl-8">
      <span
        className={`absolute left-0 top-1 grid h-5 w-5 place-items-center rounded-full border ${
          done
            ? active
              ? "border-emerald-700 bg-emerald-700 text-white"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-300"
        }`}
      >
        {done ? <Check aria-hidden="true" className="h-3 w-3" /> : null}
      </span>
      <p className={`text-sm font-semibold ${done ? "text-slate-950" : "text-slate-500"}`}>{label}</p>
      <p className="text-sm leading-6 text-slate-600">{description}</p>
      {date ? <p className="text-xs font-semibold text-slate-500">{formatBrasiliaDateTime(date)}</p> : null}
    </div>
  );
}

function StatusTimeline({ request }: { request: CareRequestDetailsData }) {
  const currentRank = statusRanks[request.status as RequestStatus] ?? 0;
  const canceled = request.status === "CANCELADO";
  const steps = canceled
    ? [
        {
          rank: 1,
          label: "Pedido enviado",
          description: "Solicitacao criada e registrada na plataforma.",
          date: request.createdAt
        },
        {
          rank: 5,
          label: "Pedido cancelado",
          description: "Atendimento encerrado sem conclusao.",
          date: request.updatedAt
        }
      ]
    : [
        {
          rank: 1,
          label: "Pedido enviado",
          description: "Solicitacao criada e registrada na plataforma.",
          date: request.createdAt
        },
        {
          rank: 2,
          label: "Aceito pelo profissional",
          description: "Profissional confirmou que pode seguir com o atendimento."
        },
        {
          rank: 3,
          label: "Agendado",
          description: "Horario confirmado para o atendimento.",
          date: request.status === "AGENDADO" ? request.updatedAt : null
        },
        {
          rank: 4,
          label: "Concluido",
          description: "Atendimento marcado como realizado.",
          date: request.status === "CONCLUIDO" ? request.updatedAt : null
        }
      ];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Historico</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Linha do tempo</h2>
        </div>
        {request.archivedAt ? (
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            Arquivado em {formatBrasiliaDateTime(request.archivedAt)}
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 border-l border-slate-200 pl-4">
        {steps.map((step) => (
          <TimelineItem
            key={step.label}
            done={canceled ? step.rank <= currentRank : currentRank >= step.rank}
            active={request.status === "CANCELADO" ? step.rank === 5 : currentRank === step.rank}
            label={step.label}
            description={step.description}
            date={step.date}
          />
        ))}
      </div>
    </article>
  );
}

export function CareRequestDetails({ request }: { request: CareRequestDetailsData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isReviewPending, startReviewTransition] = useTransition();
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState("");
  const [review, setReview] = useState(request.review);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const actions = getRequestActions(request);
  const canArchive = !request.archivedAt && ["CONCLUIDO", "CANCELADO"].includes(request.status);
  const canRestore = Boolean(request.archivedAt);
  const canDeleteFromHistory = Boolean(request.archivedAt);
  const canReview = request.viewer.canReview && !review;
  const hasAnyAction = actions.length > 0 || canArchive || canRestore || canDeleteFromHistory;

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

  function archiveRequest() {
    setError("");
    setUpdatingStatus("archive");

    startTransition(async () => {
      const response = await fetch(`/api/care-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: true })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel arquivar este atendimento.");
        setUpdatingStatus("");
        return;
      }

      router.push("/dashboard#atendimentos");
      router.refresh();
    });
  }

  function restoreRequest() {
    setError("");
    setUpdatingStatus("restore");

    startTransition(async () => {
      const response = await fetch(`/api/care-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: false })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel restaurar este atendimento.");
        setUpdatingStatus("");
        return;
      }

      router.refresh();
      setUpdatingStatus("");
    });
  }

  function deleteRequestFromHistory() {
    const confirmed = window.confirm(
      "Voce tem certeza que quer excluir este atendimento do seu historico? Ele nao vai aparecer mais para voce. Esta acao nao cancela atendimento nem apaga o registro administrativo da plataforma."
    );

    if (!confirmed) return;

    setError("");
    setUpdatingStatus("delete");

    startTransition(async () => {
      const response = await fetch(`/api/care-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteFromHistory: true })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel excluir este atendimento do historico.");
        setUpdatingStatus("");
        return;
      }

      router.push("/dashboard#atendimentos");
      router.refresh();
    });
  }

  function submitReview() {
    setReviewError("");

    startReviewTransition(async () => {
      const response = await fetch(`/api/care-requests/${request.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
      });
      const data = await response.json();

      if (!response.ok) {
        setReviewError(data.error || "Nao foi possivel salvar a avaliacao.");
        return;
      }

      setReview(data.review);
      setReviewComment("");
      router.refresh();
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
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Pedido #{request.id.slice(-6)} - atualizado em {formatBrasiliaDateTime(request.updatedAt)}
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

      <StatusTimeline request={request} />

      {request.status === "CONCLUIDO" ? (
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Avaliacao</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                {review ? "Atendimento avaliado" : "Como foi o atendimento?"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                A nota ajuda outros pacientes a escolherem com mais seguranca e melhora a qualidade da rede.
              </p>
            </div>
            {review ? (
              <div className="flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star key={index} aria-hidden="true" className={`h-4 w-4 ${index < review.rating ? "fill-amber-500 text-amber-500" : "text-amber-200"}`} />
                ))}
              </div>
            ) : null}
          </div>

          {review ? (
            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
              <p className="font-semibold">Nota enviada: {review.rating}/5</p>
              {review.comment ? <p className="mt-2">{review.comment}</p> : <p className="mt-2">Sem comentario adicional.</p>}
            </div>
          ) : null}

          {canReview ? (
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Nota</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;
                    const active = value <= reviewRating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewRating(value)}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border transition ${
                          active ? "border-amber-300 bg-amber-50 text-amber-600" : "border-slate-200 bg-white text-slate-300 hover:border-amber-200"
                        }`}
                        aria-label={`${value} de 5`}
                      >
                        <Star aria-hidden="true" className={`h-5 w-5 ${active ? "fill-amber-500" : ""}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Comentario opcional
                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  maxLength={600}
                  rows={4}
                  placeholder="Ex.: profissional pontual, cuidadoso e respeitoso durante o atendimento."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              {reviewError ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{reviewError}</div> : null}
              <button
                type="button"
                onClick={submitReview}
                disabled={isReviewPending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60 sm:w-fit"
              >
                <Star aria-hidden="true" className="h-4 w-4" />
                {isReviewPending ? "Salvando..." : "Enviar avaliacao"}
              </button>
            </div>
          ) : null}
        </article>
      ) : null}

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
              <InfoRow label="Pagamento" value={request.paymentAgreementLabel} />
              <InfoRow
                label="Regras aceitas"
                value={request.rulesAcceptedAt ? `${formatBrasiliaDateTime(request.rulesAcceptedAt)} - versao ${request.rulesVersion || "registrada"}` : "Nao registrado"}
              />
            </div>
          </article>

          {request.travelRequested ? (
            <article className="rounded-lg border border-sky-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Plane aria-hidden="true" className="h-5 w-5 text-sky-700" />
                <h2 className="text-xl font-semibold text-slate-950">Viagem ou acompanhamento fora de casa</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoRow label="Destino" value={request.travelDestination} />
                <InfoRow label="Tipo" value={request.isInternationalTravel ? "Viagem internacional" : "Viagem nacional ou local"} />
                <InfoRow label="Visto EUA" value={request.needsUsVisa ? "Necessario" : "Nao informado como necessario"} />
                <InfoRow label="Observacoes" value={request.travelNotes || "Nenhuma observacao especifica."} />
              </div>
            </article>
          ) : null}

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
              {!hasAnyAction ? (
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

              {canArchive ? (
                <button
                  type="button"
                  onClick={archiveRequest}
                  disabled={isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 disabled:cursor-wait disabled:opacity-60"
                >
                  <Archive aria-hidden="true" className="h-4 w-4" />
                  {isPending && updatingStatus === "archive" ? "Arquivando..." : "Arquivar atendimento"}
                </button>
              ) : null}
              {canRestore ? (
                <button
                  type="button"
                  onClick={restoreRequest}
                  disabled={isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 disabled:cursor-wait disabled:opacity-60"
                >
                  <Archive aria-hidden="true" className="h-4 w-4" />
                  {isPending && updatingStatus === "restore" ? "Restaurando..." : "Restaurar para o painel"}
                </button>
              ) : null}
              {canDeleteFromHistory ? (
                <button
                  type="button"
                  onClick={deleteRequestFromHistory}
                  disabled={isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  {isPending && updatingStatus === "delete" ? "Excluindo..." : "Excluir do meu historico"}
                </button>
              ) : null}
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
              {request.professional.acceptsTravel ? (
                <InfoRow
                  label="Viagens"
                  value={[
                    "Aceita acompanhamento",
                    request.professional.hasPassport ? "passaporte informado" : "",
                    request.professional.hasUsVisa ? "visto EUA informado" : ""
                  ]
                    .filter(Boolean)
                    .join(" - ")}
                />
              ) : null}
              <InfoRow label="Experiencia" value={request.professional.bio} />
              {request.professional.travelNotes ? <InfoRow label="Observacoes sobre viagem" value={request.professional.travelNotes} /> : null}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
