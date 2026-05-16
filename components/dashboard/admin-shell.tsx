"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, Check, CheckCircle2, CreditCard, ExternalLink, ListChecks, Mail, MailCheck, X } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AdminDocumentReviewData,
  AdminProfessionalSummary,
  AdminSubscriptionUser,
  BillingProviderCode,
  CareAdminOverview,
  DocumentTypeCode,
  ProfessionalVerificationStatusCode,
  SubscriptionStatusCode,
  SubscriptionTierCode,
  VerificationStatusCode
} from "@/types";

const colors = ["#047857", "#6d28d9", "#0f172a", "#be123c", "#0369a1", "#a16207"];

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

const subscriptionTierOptions: Array<{ value: SubscriptionTierCode; label: string }> = [
  { value: "FREE", label: "Gratuito" },
  { value: "PREMIUM", label: "Premium" }
];

const subscriptionStatusOptions: Array<{ value: SubscriptionStatusCode; label: string }> = [
  { value: "ATIVO", label: "Ativo" },
  { value: "TRIAL", label: "Teste" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "VENCIDO", label: "Vencido" }
];

const billingProviderOptions: Array<{ value: BillingProviderCode; label: string }> = [
  { value: "MANUAL", label: "Manual" },
  { value: "STRIPE", label: "Stripe" },
  { value: "MERCADO_PAGO", label: "Mercado Pago" }
];

const documentStatusStyles: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-900",
  VERIFICADO: "bg-emerald-50 text-emerald-800",
  RECUSADO: "bg-rose-50 text-rose-800"
};

const readinessStyles: Record<string, { badge: string; panel: string; label: string }> = {
  OK: {
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    panel: "border-emerald-200 bg-emerald-50/60",
    label: "Pronto"
  },
  WARNING: {
    badge: "bg-amber-50 text-amber-900 ring-amber-100",
    panel: "border-amber-200 bg-amber-50/60",
    label: "Atencao"
  },
  PENDING: {
    badge: "bg-rose-50 text-rose-800 ring-rose-100",
    panel: "border-rose-200 bg-rose-50/60",
    label: "Pendente"
  }
};

const requestStatusStyles: Record<string, string> = {
  ENVIADO: "bg-emerald-50 text-emerald-800",
  ACEITO: "bg-blue-50 text-blue-800",
  AGENDADO: "bg-violet-50 text-violet-800",
  CONCLUIDO: "bg-slate-950 text-white",
  CANCELADO: "bg-rose-50 text-rose-700",
  RASCUNHO: "bg-slate-100 text-slate-700"
};

const operationalAlertStyles: Record<string, { panel: string; badge: string; label: string }> = {
  OK: {
    panel: "border-emerald-200 bg-emerald-50/60",
    badge: "bg-emerald-700 text-white",
    label: "OK"
  },
  INFO: {
    panel: "border-sky-200 bg-sky-50/60",
    badge: "bg-sky-700 text-white",
    label: "Info"
  },
  WARNING: {
    panel: "border-amber-200 bg-amber-50/70",
    badge: "bg-amber-600 text-white",
    label: "Atencao"
  },
  ACTION: {
    panel: "border-rose-200 bg-rose-50/70",
    badge: "bg-rose-700 text-white",
    label: "Acao"
  }
};

const launchTestSteps = [
  {
    title: "1. Paciente entra e busca",
    detail: "Entrar com uma conta de paciente, usar localizacao, filtros, favoritos e abrir detalhes de um profissional.",
    href: "/",
    action: "Abrir busca"
  },
  {
    title: "2. Pedido e e-mail",
    detail: "Solicitar atendimento com telefone, e-mail, CEP, data, horario e revisar se o profissional recebeu aviso.",
    href: "/admin#pedidos-recentes",
    action: "Ver pedidos"
  },
  {
    title: "3. Profissional responde",
    detail: "No painel do profissional, aceitar, agendar, cancelar ou concluir o pedido e conferir notificacoes do paciente.",
    href: "/dashboard#atendimentos",
    action: "Abrir painel"
  },
  {
    title: "4. Documentos e selo",
    detail: "Enviar documentos, revisar no admin, aprovar cadastro e confirmar o selo de profissional verificado na busca.",
    href: "/admin#documentos",
    action: "Revisar docs"
  },
  {
    title: "5. Historico final",
    detail: "Concluir atendimento, avaliar profissional, arquivar historico e testar restaurar ou apagar um item arquivado.",
    href: "/dashboard#atendimentos",
    action: "Ver historico"
  }
];

const qaScenarios = [
  {
    area: "Paciente",
    scenario: "Busca e detalhes",
    steps: "Entrar como paciente, usar filtro, abrir detalhes, favoritar e iniciar uma mensagem antes do pedido.",
    expected: "Lista carrega, mapa aparece, favorito grava e conversa aparece no painel."
  },
  {
    area: "Paciente",
    scenario: "Solicitacao completa",
    steps: "Escolher profissional verificado, preencher data, horario, duracao, CEP, endereco e aceite das regras.",
    expected: "Pedido fica enviado, profissional recebe notificacao e paciente ve o pedido no painel."
  },
  {
    area: "Profissional",
    scenario: "Agenda e resposta",
    steps: "Entrar como profissional, conferir agenda, aceitar/agendar pedido e responder mensagem.",
    expected: "Status atualiza para paciente, mensagem fica na conversa e horario ocupado nao duplica."
  },
  {
    area: "Profissional",
    scenario: "Documentos e selo",
    steps: "Enviar CPF, RG/CNH, comprovante e registro profissional quando aplicavel.",
    expected: "Documentos aparecem no admin, status individual muda e selo so aparece quando aprovado."
  },
  {
    area: "Admin",
    scenario: "Revisao operacional",
    steps: "Abrir admin, filtrar documentos, aprovar/recusar, revisar profissionais sem foto, sem agenda ou sem selo.",
    expected: "Auditoria registra a acao e os alertas operacionais reduzem quando o cadastro fica completo."
  },
  {
    area: "Assinatura",
    scenario: "Bloqueio de plano",
    steps: "Marcar paciente como cancelado ou vencido no admin e tentar novo pedido, favorito e mensagem.",
    expected: "Sistema bloqueia novas acoes com aviso claro, sem afetar profissional ou admin."
  },
  {
    area: "Historico",
    scenario: "Conclusao e avaliacao",
    steps: "Concluir atendimento apos horario permitido, avaliar profissional, arquivar e consultar historico.",
    expected: "Avaliacao soma na busca, pedido sai dos ativos e pode ser localizado no historico."
  },
  {
    area: "Producao",
    scenario: "Saude publica",
    steps: "Rodar npm run smoke:prod depois de deploy ou antes de enviar o link para alguem testar.",
    expected: "Paginas publicas, robots, sitemap e /api/health respondem sem erro."
  }
];

const professionalFilters = [
  { value: "PENDENCIAS", label: "Com pendencias" },
  { value: "SEM_SELO", label: "Sem selo" },
  { value: "SEM_AGENDA", label: "Sem agenda" },
  { value: "SEM_FOTO", label: "Sem foto" },
  { value: "TODOS", label: "Todos" }
];

function formatAdminDate(value: string | null) {
  if (!value) return "Sem horario";

  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function dateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function professionalNextSteps(professional: AdminProfessionalSummary) {
  const steps: string[] = [];

  if (!professional.isVerified) {
    if (professional.missingRequiredDocuments.length > 0) {
      steps.push(`Selo: faltam ${professional.missingRequiredDocuments.join(", ")}.`);
    }
    if (professional.pendingDocuments > 0) {
      steps.push("Revisar os documentos enviados e depois aprovar o cadastro.");
    } else if (professional.verifiedDocuments === 0) {
      steps.push("Solicitar que o profissional envie os documentos no Meu painel.");
    } else if (professional.verificationStatusLabel !== "Aprovado") {
      steps.push("Aprovar o cadastro depois que os documentos obrigatorios estiverem corretos.");
    }
  }

  if (professional.availabilityCount === 0) {
    steps.push("Agenda: o profissional precisa marcar dias e horarios no Meu painel e salvar o perfil.");
  }

  if (!professional.hasPhoto) {
    steps.push("Foto: pedir envio da foto do perfil para aumentar confianca na busca.");
  }

  if (professional.servicesCount === 0) {
    steps.push("Servicos: pedir que o profissional marque os atendimentos que realiza.");
  }

  return steps.length > 0 ? steps : ["Perfil operacionalmente pronto."];
}

function professionalMailto(professional: AdminProfessionalSummary) {
  const subject = "CuidarLink - completar perfil profissional";
  const body = [
    `Ola, ${professional.name}.`,
    "",
    "Para seu perfil aparecer melhor na CuidarLink, precisamos ajustar os pontos abaixo:",
    ...professionalNextSteps(professional).map((step) => `- ${step}`),
    "",
    "Entre no Meu painel da CuidarLink, atualize as informacoes e salve o perfil.",
    "Obrigado!"
  ].join("\n");

  return `mailto:${professional.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function AdminDocumentCard({ document }: { document: AdminDocumentReviewData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(document.reviewNote || "");
  const [correctedType, setCorrectedType] = useState<DocumentTypeCode>(document.type);
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

  function reviewProfessional(status: ProfessionalVerificationStatusCode) {
    setError("");

    startTransition(async () => {
      const response = await fetch(`/api/admin/professionals/${document.professionalId}/verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel revisar o cadastro.");
        return;
      }

      router.refresh();
    });
  }

  function saveDocumentType() {
    setError("");

    startTransition(async () => {
      const response = await fetch(`/api/admin/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: correctedType, reviewNote: note })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel corrigir o tipo do documento.");
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
          <p className="mt-1 text-sm text-slate-500">
            Cadastro: {document.professionalVerificationStatusLabel}
            {document.professionalCpfMasked ? ` - CPF ${document.professionalCpfMasked}` : ""}
            {document.professionalRegistrationUf ? ` - UF ${document.professionalRegistrationUf}` : ""}
          </p>
        </div>
        <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${documentStatusStyles[document.status]}`}>
          {document.statusLabel}
        </span>
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Documento: {document.typeLabel}</p>
        <p className="mt-1 font-semibold text-slate-950">{document.label}</p>
        <p className="mt-1 text-sm text-slate-600">
          {document.typeLabel}
          {document.documentNumber ? ` - ${document.documentNumber}` : ""}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Tipo correto
            <select
              value={correctedType}
              onChange={(event) => setCorrectedType(event.target.value as DocumentTypeCode)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
            >
              {documentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={saveDocumentType}
            disabled={isPending || correctedType === document.type}
            className="inline-flex h-10 items-center justify-center self-end rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Salvar tipo
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          {document.downloadUrl ? (
            <a href={document.downloadUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              Abrir arquivo
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          ) : null}
          {document.expiresAt ? <span className="text-slate-500">Validade {new Date(document.expiresAt).toLocaleDateString("pt-BR")}</span> : null}
        </div>
        {(document.type === "COREN" || document.type === "CREFITO") ? (
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <a
              href={document.type === "COREN" ? "https://www.portalcoren-rs.gov.br/" : "https://www.crefito5.org.br/"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-700"
            >
              Consultar {document.typeLabel}
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : null}
        {document.externalCheckMessage ? <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{document.externalCheckMessage}</p> : null}
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
        <button
          type="button"
          onClick={() => reviewProfessional("APROVADO")}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-emerald-500 disabled:cursor-wait disabled:opacity-70"
        >
          Aprovar cadastro
        </button>
        <button
          type="button"
          onClick={() => reviewProfessional("REPROVADO")}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-rose-400 disabled:cursor-wait disabled:opacity-70"
        >
          Reprovar cadastro
        </button>
      </div>
    </article>
  );
}

function AdminSubscriptionCard({ user }: { user: AdminSubscriptionUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tier, setTier] = useState<SubscriptionTierCode>(user.subscriptionTier);
  const [status, setStatus] = useState<SubscriptionStatusCode>(user.subscriptionStatus);
  const [provider, setProvider] = useState<BillingProviderCode>(user.subscriptionProvider);
  const [trialEndsAt, setTrialEndsAt] = useState(dateInputValue(user.subscriptionTrialEndsAt));
  const [renewsAt, setRenewsAt] = useState(dateInputValue(user.subscriptionRenewsAt));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function saveSubscription() {
    setMessage("");
    setError("");

    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${user.id}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, status, provider, trialEndsAt, renewsAt })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel atualizar a assinatura.");
        return;
      }

      setMessage("Assinatura atualizada.");
      router.refresh();
    });
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald-700">{user.accountTypeLabel}</p>
          <h4 className="mt-1 text-lg font-semibold text-slate-950">{user.name}</h4>
          <p className="mt-1 text-sm text-slate-600">{user.email}</p>
          {user.profileLabel ? <p className="mt-1 text-sm text-slate-500">{user.profileLabel}</p> : null}
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {user.subscriptionTierLabel} / {user.subscriptionStatusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Plano
          <select
            value={tier}
            onChange={(event) => setTier(event.target.value as SubscriptionTierCode)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
          >
            {subscriptionTierOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as SubscriptionStatusCode)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
          >
            {subscriptionStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Cobranca
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value as BillingProviderCode)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
          >
            {billingProviderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Teste ate
          <input
            type="date"
            value={trialEndsAt}
            onChange={(event) => setTrialEndsAt(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Renova em
          <input
            type="date"
            value={renewsAt}
            onChange={(event) => setRenewsAt(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
          />
        </label>
        <button
          type="button"
          onClick={saveSubscription}
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
        <p>Inicio: {formatAdminDate(user.subscriptionStartedAt)}</p>
        <p>Cancelado: {formatAdminDate(user.subscriptionCanceledAt)}</p>
      </div>
      {message ? <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm font-semibold text-emerald-800">{message}</p> : null}
      {error ? <p className="mt-3 rounded-lg bg-rose-50 p-2 text-sm font-semibold text-rose-700">{error}</p> : null}
    </article>
  );
}

export function AdminShell({ overview }: { overview: CareAdminOverview }) {
  const [statusFilter, setStatusFilter] = useState("ABERTOS");
  const [typeFilter, setTypeFilter] = useState("TODOS");
  const [documentTypeFilter, setDocumentTypeFilter] = useState("TODOS");
  const [ufFilter, setUfFilter] = useState("TODAS");
  const [professionalFilter, setProfessionalFilter] = useState("PENDENCIAS");
  const [emailTestPending, startEmailTestTransition] = useTransition();
  const [emailTestMessage, setEmailTestMessage] = useState("");
  const [emailTestError, setEmailTestError] = useState("");
  const filteredDocuments = overview.documentsForReview.filter((document) => {
    const statusMatches =
      statusFilter === "TODOS" ||
      (statusFilter === "ABERTOS" && (document.status !== "VERIFICADO" || document.professionalVerificationStatus !== "APROVADO")) ||
      document.professionalVerificationStatus === statusFilter ||
      document.status === statusFilter;
    const typeMatches = typeFilter === "TODOS" || document.professionalTypeLabel === typeFilter;
    const documentTypeMatches = documentTypeFilter === "TODOS" || document.type === documentTypeFilter;
    const ufMatches = ufFilter === "TODAS" || document.professionalRegistrationUf === ufFilter;
    return statusMatches && typeMatches && documentTypeMatches && ufMatches;
  });
  const professionalTypes = Array.from(new Set(overview.documentsForReview.map((document) => document.professionalTypeLabel)));
  const registrationUfs = Array.from(new Set(overview.documentsForReview.map((document) => document.professionalRegistrationUf).filter(Boolean)));
  const filteredProfessionals = overview.professionalDirectory.filter((professional) => {
    if (professionalFilter === "TODOS") return true;
    if (professionalFilter === "SEM_SELO") return !professional.isVerified;
    if (professionalFilter === "SEM_AGENDA") return professional.availabilityCount === 0;
    if (professionalFilter === "SEM_FOTO") return !professional.hasPhoto;
    return professional.issues.length > 0;
  });
  const summaryCards = [
    { label: "Usuarios", value: String(overview.users) },
    { label: "Pacientes", value: String(overview.patients) },
    { label: "Profissionais", value: String(overview.professionals) },
    { label: "Premium", value: String(overview.premiumUsers) },
    { label: "Verificados", value: String(overview.verifiedProfessionals) },
    { label: "Pedidos abertos", value: String(overview.openRequests) },
    { label: "Docs pendentes", value: String(overview.pendingDocuments) }
  ];
  const readyChecks = overview.readinessChecks.filter((check) => check.status === "OK").length;
  const blockingChecks = overview.readinessChecks.filter((check) => check.status === "PENDING").length;

  function sendEmailTest() {
    setEmailTestMessage("");
    setEmailTestError("");

    startEmailTestTransition(async () => {
      const response = await fetch("/api/admin/email-test", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setEmailTestError(data.error || "Nao foi possivel enviar o e-mail de teste.");
        return;
      }

      setEmailTestMessage(data.message || "E-mail de teste enviado.");
    });
  }

  return (
    <section className="surface space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</h2>
          </article>
        ))}
      </div>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Pre-lancamento</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Checklist de producao</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Use esta lista antes de chamar usuarios reais para testar cadastro, busca, documentos, pedidos e notificacoes.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-600">
            <p className="font-semibold text-slate-950">
              {readyChecks}/{overview.readinessChecks.length} prontos
            </p>
            <p>{blockingChecks > 0 ? `${blockingChecks} pendencia bloqueante` : "Sem pendencia bloqueante"}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {overview.readinessChecks.map((check) => {
            const style = readinessStyles[check.status];
            const Icon = check.status === "OK" ? CheckCircle2 : AlertTriangle;

            return (
              <div key={check.key} className={`rounded-lg border p-4 ${style.panel}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                    <div>
                      <p className="font-semibold text-slate-950">{check.label}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{check.detail}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${style.badge}`}>
                    {style.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Comercial</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Planos e assinatura</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Visao inicial para acompanhar quem esta no gratuito ou premium. A cobranca online ainda nao esta ativa.
            </p>
          </div>
          <CreditCard aria-hidden="true" className="h-6 w-6 text-emerald-700" />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Por plano</p>
            <div className="mt-3 grid gap-2">
              {overview.subscriptionMix.map((plan) => (
                <div key={plan.tier} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                  <span className="font-semibold text-slate-800">{plan.label}</span>
                  <span className="text-lg font-semibold text-slate-950">{plan.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Por status</p>
            <div className="mt-3 grid gap-2">
              {overview.subscriptionStatusMix.map((status) => (
                <div key={status.status} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                  <span className="font-semibold text-slate-800">{status.label}</span>
                  <span className="text-lg font-semibold text-slate-950">{status.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Cobranca</p>
            <div className="mt-3 grid gap-2">
              {overview.billingProviderMix.map((provider) => (
                <div key={provider.provider} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
                  <span className="font-semibold text-slate-800">{provider.label}</span>
                  <span className="text-lg font-semibold text-slate-950">{provider.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {overview.subscriptionMix.map((plan) => (
            <div key={plan.tier} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-950">{plan.label}</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {plan.tier}
                </span>
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{plan.count}</p>
              <p className="mt-1 text-sm text-slate-600">usuario(s)</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Controle manual</p>
              <h4 className="mt-1 text-lg font-semibold text-slate-950">Usuarios e planos</h4>
            </div>
            <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              {overview.subscriptionUsers.length} usuario(s)
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {overview.subscriptionUsers.map((user) => (
              <AdminSubscriptionCard key={user.id} user={user} />
            ))}
          </div>
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Teste guiado</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Roteiro de validacao ponta a ponta</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Siga esta ordem quando for testar com contas reais. Ela cobre o caminho principal de paciente, profissional e admin.
            </p>
          </div>
          <ListChecks aria-hidden="true" className="h-6 w-6 text-emerald-700" />
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          {launchTestSteps.map((step) => (
            <div key={step.title} className="flex min-h-44 flex-col rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold leading-5 text-slate-950">{step.title}</p>
              <p className="mt-2 flex-1 text-sm leading-5 text-slate-600">{step.detail}</p>
              <Link
                href={step.href}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500"
              >
                {step.action}
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          Antes de chamar usuarios externos, rode tambem <span className="font-semibold">npm run smoke:prod</span>. Esse comando valida
          producao, SEO basico e dependencias principais sem depender de clique manual.
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">QA manual</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Cenarios criticos para testar</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Use esta matriz quando for testar como paciente, profissional e admin. O objetivo e validar comportamento real, nao so tela abrindo.
            </p>
          </div>
          <Link
            href="https://cuidar-link.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500"
          >
            Abrir producao
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[120px_minmax(0,1fr)] bg-slate-50 text-xs font-semibold uppercase text-slate-500 md:grid-cols-[140px_180px_minmax(0,1fr)_minmax(0,1fr)]">
            <div className="border-b border-slate-200 p-3">Area</div>
            <div className="hidden border-b border-slate-200 p-3 md:block">Cenario</div>
            <div className="border-b border-slate-200 p-3">Como testar</div>
            <div className="hidden border-b border-slate-200 p-3 md:block">Resultado esperado</div>
          </div>
          {qaScenarios.map((item) => (
            <div
              key={`${item.area}-${item.scenario}`}
              className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-slate-200 last:border-b-0 md:grid-cols-[140px_180px_minmax(0,1fr)_minmax(0,1fr)]"
            >
              <div className="p-3 text-sm font-semibold text-emerald-700">{item.area}</div>
              <div className="hidden p-3 text-sm font-semibold text-slate-950 md:block">{item.scenario}</div>
              <div className="p-3 text-sm leading-6 text-slate-700">
                <span className="block font-semibold text-slate-950 md:hidden">{item.scenario}</span>
                {item.steps}
                <span className="mt-2 block text-slate-500 md:hidden">Esperado: {item.expected}</span>
              </div>
              <div className="hidden p-3 text-sm leading-6 text-slate-700 md:block">{item.expected}</div>
            </div>
          ))}
        </div>
      </article>

      <article id="email" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Notificacoes</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Teste de e-mail</h3>
            <p className="mt-2 text-sm text-slate-600">
              Envia uma mensagem real pelo Resend para validar remetente, chave e destinatarios administrativos.
            </p>
          </div>
          <button
            type="button"
            onClick={sendEmailTest}
            disabled={emailTestPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:bg-emerald-500"
          >
            <MailCheck aria-hidden="true" className="h-4 w-4" />
            {emailTestPending ? "Enviando..." : "Enviar e-mail de teste"}
          </button>
        </div>
        {emailTestMessage ? (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{emailTestMessage}</p>
        ) : null}
        {emailTestError ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-semibold text-rose-700">{emailTestError}</p> : null}
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Atencao operacional</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Pontos para acompanhar</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Alertas calculados com base nos pedidos, profissionais, documentos e notificacoes configuradas.
            </p>
          </div>
          <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            {overview.operationalAlerts.length} item(ns)
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {overview.operationalAlerts.map((alert) => {
            const style = operationalAlertStyles[alert.severity];
            const Icon = alert.severity === "OK" ? CheckCircle2 : AlertTriangle;

            return (
              <div key={alert.key} className={`rounded-lg border p-4 ${style.panel}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                    <div>
                      <p className="font-semibold text-slate-950">{alert.title}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{alert.detail}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>{style.label}</span>
                </div>
                {alert.actionHref && alert.actionLabel ? (
                  <Link
                    href={alert.actionHref}
                    className="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500"
                  >
                    {alert.actionLabel}
                  </Link>
                ) : null}
              </div>
            );
          })}
        </div>
      </article>

      <article id="profissionais-operacao" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Rede profissional</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Profissionais para acompanhar</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Lista operacional para ver rapidamente quem precisa de selo, agenda, foto ou revisao de documentos.
            </p>
          </div>
          <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            {filteredProfessionals.length}/{overview.professionalDirectory.length}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {professionalFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setProfessionalFilter(filter.value)}
              aria-pressed={professionalFilter === filter.value}
              className={`h-9 rounded-lg px-3 text-sm font-semibold transition ${
                professionalFilter === filter.value
                  ? "bg-emerald-700 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:border-emerald-500"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-3 xl:grid-cols-2">
          {filteredProfessionals.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Nenhum profissional encontrado para este filtro.
            </div>
          ) : null}
          {filteredProfessionals.map((professional) => (
            <div key={professional.id} className="rounded-lg border border-slate-200 p-4">
              {(() => {
                const hasDocuments = professional.pendingDocuments + professional.verifiedDocuments > 0;
                const nextSteps = professionalNextSteps(professional);

                return (
                  <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">{professional.professionalTypeLabel}</p>
                  <h4 className="mt-1 text-lg font-semibold text-slate-950">{professional.name}</h4>
                  <p className="mt-1 text-sm text-slate-600">{professional.email}</p>
                  <p className="mt-1 text-xs font-semibold uppercase text-slate-500">
                    Plano {professional.subscriptionTierLabel} - {professional.subscriptionStatusLabel} - {professional.subscriptionProviderLabel}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {professional.neighborhood}, {professional.city}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${professional.isVerified ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                  {professional.isVerified ? "Verificado" : professional.verificationStatusLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Agenda</p>
                  <p className="mt-1 font-semibold text-slate-950">{professional.availabilityCount} horario(s)</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Docs OK</p>
                  <p className="mt-1 font-semibold text-slate-950">{professional.verifiedDocuments}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Pendentes</p>
                  <p className="mt-1 font-semibold text-slate-950">{professional.pendingDocuments}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Foto</p>
                  <p className="mt-1 font-semibold text-slate-950">{professional.hasPhoto ? "Sim" : "Nao"}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {professional.issues.length > 0 ? (
                  professional.issues.map((issue) => (
                    <span key={issue} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                      {issue}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    Perfil operacionalmente pronto
                  </span>
                )}
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Proximo passo</p>
                <ul className="mt-2 grid gap-1 text-sm leading-5 text-slate-700">
                  {nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                {professional.missingRequiredDocuments.length > 0 ? (
                  <p className="mt-2 text-xs font-semibold text-amber-800">
                    Documentos obrigatorios pendentes: {professional.missingRequiredDocuments.join(", ")}.
                  </p>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Atualizado em {formatAdminDate(professional.updatedAt)}</p>
                <div className="flex flex-wrap gap-2">
                  {hasDocuments ? (
                    <Link
                      href="/admin#documentos"
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-500"
                    >
                      Ver docs
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
                      Sem docs enviados
                    </span>
                  )}
                  <a
                    href={professionalMailto(professional)}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Mail aria-hidden="true" className="h-4 w-4" />
                    Orientar
                  </a>
                </div>
              </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      </article>

      <article id="pedidos-recentes" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Operacao</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">Pedidos recentes</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Ultimos pedidos criados na plataforma, com link direto para conferencia do atendimento.
            </p>
          </div>
          <Link
            href="/dashboard#atendimentos"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-emerald-500"
          >
            <CalendarClock aria-hidden="true" className="h-4 w-4" />
            Ver painel
          </Link>
        </div>
        <div className="mt-5 grid gap-3">
          {overview.recentCareRequests.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Nenhum pedido criado ainda.
            </div>
          ) : null}
          {overview.recentCareRequests.map((request) => (
            <div key={request.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-950">{request.serviceLabel}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${requestStatusStyles[request.status] || "bg-slate-100 text-slate-700"}`}>
                      {request.statusLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Paciente: {request.requesterName} {request.requesterPhone ? `- ${request.requesterPhone}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Profissional: {request.professionalName} - {request.professionalRole}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Local: {request.neighborhood}, {request.city}
                  </p>
                </div>
                <div className="grid gap-2 text-left sm:text-right">
                  <p className="text-sm font-semibold text-slate-700">{formatAdminDate(request.scheduledFor)}</p>
                  <p className="text-xs text-slate-500">Criado em {formatAdminDate(request.createdAt)}</p>
                  <Link
                    href={`/dashboard/atendimentos/${request.id}`}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Abrir pedido
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </article>

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

      <article id="documentos" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Verificacao</p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">Documentos para revisar</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A fila abre mostrando apenas pendencias. Para auditoria ou conferencia historica, altere o filtro para todos os status.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
          >
            <option value="ABERTOS">Somente pendencias</option>
            <option value="TODOS">Todos os status</option>
            <option value="PENDENTE">Pendente / enviado</option>
            <option value="EM_ANALISE">Em analise</option>
            <option value="APROVADO">Cadastro aprovado</option>
            <option value="REPROVADO">Cadastro reprovado</option>
            <option value="VERIFICADO">Documento aprovado</option>
            <option value="RECUSADO">Documento reprovado</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
          >
            <option value="TODOS">Todos os profissionais</option>
            {professionalTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={documentTypeFilter}
            onChange={(event) => setDocumentTypeFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
          >
            <option value="TODOS">Todos os documentos</option>
            {documentOptions.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            value={ufFilter}
            onChange={(event) => setUfFilter(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
          >
            <option value="TODAS">Todas as UFs</option>
            {registrationUfs.map((uf) => (
              <option key={uf} value={uf || ""}>
                {uf}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {filteredDocuments.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Nenhum documento encontrado para estes filtros.
            </div>
          ) : null}

          {filteredDocuments.map((document) => (
            <AdminDocumentCard key={document.id} document={document} />
          ))}
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Auditoria</p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">Acoes administrativas recentes</h3>
        <div className="mt-5 grid gap-3">
          {overview.auditLogs.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Nenhuma acao registrada ainda.</div>
          ) : null}
          {overview.auditLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-950">
                {log.action} {log.nextStatus ? `-> ${log.nextStatus}` : ""}
              </p>
              <p className="mt-1">{new Date(log.createdAt).toLocaleString("pt-BR")}</p>
              {log.note ? <p className="mt-2 rounded-lg bg-slate-50 p-3">{log.note}</p> : null}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
