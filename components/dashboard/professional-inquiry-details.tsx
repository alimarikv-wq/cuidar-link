"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, MessageSquareText, Phone, Send, ShieldCheck, UserRound } from "lucide-react";
import { formatBrasiliaDateTime } from "@/lib/date-time";
import { ProfessionalInquiryDetailsData } from "@/types";

function ContactRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value || "Não informado"}</p>
    </div>
  );
}

function InquiryMessagesPanel({ inquiry }: { inquiry: ProfessionalInquiryDetailsData }) {
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState(inquiry.messages);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function refreshMessages() {
      if (document.visibilityState === "hidden") return;

      try {
        const response = await fetch(`/api/professional-inquiries/${inquiry.id}/messages`, { cache: "no-store" });
        const data = await response.json();

        if (!cancelled && response.ok && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      } catch {
        // A conversa continua funcional mesmo se uma consulta de atualização falhar.
      }
    }

    refreshMessages();
    const interval = window.setInterval(refreshMessages, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [inquiry.id]);

  function sendMessage() {
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Escreva uma mensagem antes de enviar.");
      return;
    }

    setError("");

    startTransition(async () => {
      const response = await fetch(`/api/professional-inquiries/${inquiry.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Não foi possível enviar a mensagem.");
        return;
      }

      setMessages((current) => [...current, data.message]);
      setBody("");
    });
  }

  return (
    <article id="mensagens" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Conversa inicial</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">Mensagem antes do pedido</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Use esta conversa para tirar dúvidas. Quando os combinados estiverem claros, o paciente pode solicitar o atendimento completo.
          </p>
        </div>
        <MessageSquareText aria-hidden="true" className="h-6 w-6 text-emerald-700" />
      </div>

      <div className="mt-5 grid max-h-[420px] gap-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[88%] rounded-lg border p-3 text-sm leading-6 shadow-sm ${
              message.isOwn
                ? "justify-self-end border-emerald-200 bg-emerald-50 text-emerald-950"
                : "justify-self-start border-slate-200 bg-white text-slate-800"
            }`}
          >
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span>{message.isOwn ? "Você" : message.senderName}</span>
              <span>{formatBrasiliaDateTime(message.createdAt)}</span>
            </div>
            <p className="whitespace-pre-line">{message.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-2 text-sm font-semibold text-slate-800">
          Nova mensagem
          <textarea
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              setError("");
            }}
            rows={4}
            maxLength={1000}
            placeholder="Ex.: Oi, podemos conversar sobre disponibilidade, experiencia e detalhes do cuidado?"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
        <button
          type="button"
          onClick={sendMessage}
          disabled={isPending || body.trim().length === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
        >
          <Send aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Enviando..." : "Enviar mensagem"}
        </button>
      </div>
    </article>
  );
}

export function ProfessionalInquiryDetails({ inquiry }: { inquiry: ProfessionalInquiryDetailsData }) {
  const otherPerson = inquiry.viewer.canActAsProfessional ? inquiry.patient.name : inquiry.professional.name;

  return (
    <section className="surface space-y-6">
      <Link href="/dashboard#mensagens-iniciais" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Voltar ao painel
      </Link>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Mensagem</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-950">{otherPerson}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Conversa com {inquiry.professional.name} antes de abrir um pedido de atendimento.
            </p>
            {inquiry.fixedContractRequested ? (
              <p className="mt-2 inline-flex rounded-lg bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
                Interesse em rotina fixa/contrato fixo
              </p>
            ) : null}
            <p className="mt-2 text-xs font-semibold text-slate-500">Criada em {formatBrasiliaDateTime(inquiry.createdAt)}</p>
          </div>
          <span className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
            {inquiry.statusLabel}
          </span>
        </div>
      </article>

      <InquiryMessagesPanel inquiry={inquiry} />

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserRound aria-hidden="true" className="h-5 w-5 text-emerald-700" />
            <h2 className="text-xl font-semibold text-slate-950">Paciente</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ContactRow label="Nome" value={inquiry.patient.name} />
            <ContactRow label="Telefone" value={inquiry.patient.phone} />
            <ContactRow label="E-mail" value={inquiry.patient.email} />
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-5 w-5 text-emerald-700" />
            <h2 className="text-xl font-semibold text-slate-950">Profissional</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ContactRow label="Nome" value={inquiry.professional.name} />
            <ContactRow label="Perfil" value={inquiry.professional.roleLabel} />
            <ContactRow label="E-mail" value={inquiry.professional.email} />
            <ContactRow label="Telefone" value={inquiry.professional.phone} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {inquiry.professional.phone ? (
              <a
                href={`tel:${inquiry.professional.phone}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500"
              >
                <Phone aria-hidden="true" className="h-4 w-4" />
                Ligar
              </a>
            ) : null}
            <a
              href={`mailto:${inquiry.professional.email}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500"
            >
              <Mail aria-hidden="true" className="h-4 w-4" />
              E-mail
            </a>
          </div>
        </article>
      </div>
    </section>
  );
}
