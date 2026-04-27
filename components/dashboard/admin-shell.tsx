"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AdminDocumentReviewData, CareAdminOverview, VerificationStatusCode } from "@/types";

const colors = ["#047857", "#6d28d9", "#0f172a", "#be123c", "#0369a1", "#a16207"];

const documentStatusStyles: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-900",
  VERIFICADO: "bg-emerald-50 text-emerald-800",
  RECUSADO: "bg-rose-50 text-rose-800"
};

function AdminDocumentCard({ document }: { document: AdminDocumentReviewData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(document.reviewNote || "");
  const [error, setError] = useState("");

  function review(status: VerificationStatusCode) {
    setError("");

    startTransition(async () => {
      const response = await fetch(`/api/admin/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: note })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel revisar o documento.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">{document.professionalTypeLabel}</p>
          <h4 className="mt-1 text-lg font-semibold text-slate-950">{document.professionalName}</h4>
          <p className="mt-1 text-sm text-slate-500">{document.professionalEmail}</p>
        </div>
        <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${documentStatusStyles[document.status]}`}>
          {document.statusLabel}
        </span>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <p className="font-semibold text-slate-950">{document.label}</p>
        <p className="mt-1 text-sm text-slate-600">
          {document.typeLabel}
          {document.documentNumber ? ` - ${document.documentNumber}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {document.fileUrl ? (
            <a href={document.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              Abrir arquivo
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {document.expiresAt ? <span className="text-slate-500">Validade {new Date(document.expiresAt).toLocaleDateString("pt-BR")}</span> : null}
        </div>
      </div>

      <label className="mt-4 grid gap-1 text-sm font-semibold text-slate-700">
        Observacao da revisao
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      {error ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => review("VERIFICADO")}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
        >
          <Check aria-hidden="true" className="h-4 w-4" />
          Aprovar
        </button>
        <button
          type="button"
          onClick={() => review("RECUSADO")}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-70"
        >
          <X aria-hidden="true" className="h-4 w-4" />
          Recusar
        </button>
      </div>
    </article>
  );
}

export function AdminShell({ overview }: { overview: CareAdminOverview }) {
  const summaryCards = [
    { label: "Usuarios", value: String(overview.users) },
    { label: "Pacientes", value: String(overview.patients) },
    { label: "Profissionais", value: String(overview.professionals) },
    { label: "Verificados", value: String(overview.verifiedProfessionals) },
    { label: "Pedidos abertos", value: String(overview.openRequests) },
    { label: "Docs pendentes", value: String(overview.pendingDocuments) }
  ];

  return (
    <section className="surface space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</h2>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">Rede profissional</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Distribuicao por tipo</h3>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.professionalsByType}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="count" fill="#047857" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">Solicitacoes</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Status operacional</h3>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={overview.requestsByStatus} dataKey="count" nameKey="label" innerRadius={60} outerRadius={95}>
                  {overview.requestsByStatus.map((entry, index) => (
                    <Cell key={entry.label} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Verificacao</p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">Documentos para revisar</h3>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {overview.documentsForReview.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Nenhum documento enviado ainda.
            </div>
          ) : null}

          {overview.documentsForReview.map((document) => (
            <AdminDocumentCard key={document.id} document={document} />
          ))}
        </div>
      </article>
    </section>
  );
}
