import { CareRequestStatus, CareService, TransferSupportLevel } from "@prisma/client";

type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

type CareRequestNotificationData = {
  id: string;
  status: CareRequestStatus;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  service: CareService;
  supportNeed: TransferSupportLevel;
  scheduledFor: Date | null;
  addressLine: string;
  addressNumber: string | null;
  addressComplement: string | null;
  neighborhood: string;
  city: string;
  state: string | null;
  notes: string | null;
  professional: {
    user: {
      name: string;
      email: string;
    };
  };
};

const serviceLabel: Record<CareService, string> = {
  BANHO: "Banho",
  TRANSFERENCIA: "Transferencia",
  MEDICACAO: "Medicacao",
  CURATIVOS: "Curativos",
  FISIOTERAPIA: "Fisioterapia",
  COMPANHIA: "Companhia",
  REFEICAO: "Refeicao",
  SINAIS_VITAIS: "Sinais vitais",
  AVALIACAO: "Avaliacao",
  FORTALECIMENTO: "Fortalecimento"
};

const supportLabel: Record<TransferSupportLevel, string> = {
  MODERADO: "Apoio moderado",
  ALTO: "Apoio fisico alto",
  DUPLA: "Duas pessoas"
};

const statusLabel: Record<CareRequestStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  ACEITO: "Aceito",
  AGENDADO: "Agendado",
  CONCLUIDO: "Concluido",
  CANCELADO: "Cancelado"
};

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://cuidar-link.vercel.app";
}

function parseEmails(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function escapeHtml(value: string | null | undefined) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value: Date | null) {
  if (!value) return "A combinar";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(value);
}

function formatAddress(request: CareRequestNotificationData) {
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

function requestDetailsText(request: CareRequestNotificationData) {
  return [
    `Paciente: ${request.requesterName}`,
    `Telefone: ${request.requesterPhone || "Nao informado"}`,
    `Servico: ${serviceLabel[request.service]}`,
    `Apoio: ${supportLabel[request.supportNeed]}`,
    `Horario: ${formatDate(request.scheduledFor)}`,
    `Endereco: ${formatAddress(request)}`,
    request.notes ? `Observacoes: ${request.notes}` : "",
    `Painel: ${appUrl()}/dashboard`
  ]
    .filter(Boolean)
    .join("\n");
}

function requestDetailsHtml(request: CareRequestNotificationData) {
  const rows = [
    ["Paciente", request.requesterName],
    ["Telefone", request.requesterPhone || "Nao informado"],
    ["Servico", serviceLabel[request.service]],
    ["Apoio", supportLabel[request.supportNeed]],
    ["Horario", formatDate(request.scheduledFor)],
    ["Endereco", formatAddress(request)],
    ["Observacoes", request.notes || "Sem observacoes"]
  ];

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h1 style="font-size:20px;margin:0 0 12px">CuidarLink</h1>
      <table style="width:100%;border-collapse:collapse">
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#475569;font-weight:700">${escapeHtml(label)}</td>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(value)}</td>
              </tr>
            `
          )
          .join("")}
      </table>
      <p style="margin:16px 0 0">
        <a href="${appUrl()}/dashboard" style="color:#047857;font-weight:700">Abrir painel</a>
      </p>
    </div>
  `;
}

export function isEmailNotificationsConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

async function sendEmail(input: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { ok: false as const, skipped: true as const, error: "Notificacoes por e-mail nao configuradas." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  if (!response.ok) {
    return { ok: false as const, skipped: false as const, error: await response.text() };
  }

  return { ok: true as const, skipped: false as const };
}

export async function sendNewCareRequestNotifications(request: CareRequestNotificationData) {
  const professionalEmail = request.professional.user.email;
  const adminEmails = parseEmails(process.env.CARE_ADMIN_EMAILS);
  const subject = `Novo pedido: ${serviceLabel[request.service]} para ${request.requesterName}`;
  const text = requestDetailsText(request);
  const html = requestDetailsHtml(request);

  await sendEmail({
    to: professionalEmail,
    subject,
    text,
    html
  });

  if (adminEmails.length > 0) {
    await sendEmail({
      to: adminEmails,
      subject: `[Admin] ${subject}`,
      text,
      html
    });
  }
}

export async function sendCareRequestStatusNotification(request: CareRequestNotificationData) {
  if (!request.requesterEmail) return;

  const status = statusLabel[request.status];
  const subject = `Atualizacao do atendimento: ${status}`;
  const text = [
    `O atendimento com ${request.professional.user.name} foi atualizado para: ${status}.`,
    "",
    requestDetailsText(request)
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h1 style="font-size:20px;margin:0 0 12px">Atualizacao do atendimento</h1>
      <p>O atendimento com <strong>${escapeHtml(request.professional.user.name)}</strong> foi atualizado para <strong>${escapeHtml(status)}</strong>.</p>
      ${requestDetailsHtml(request)}
    </div>
  `;

  await sendEmail({
    to: request.requesterEmail,
    subject,
    text,
    html
  });
}
