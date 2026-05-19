import { CareRequestStatus, CareService, TransferSupportLevel } from "@prisma/client";
import { CARE_REQUEST_PAYMENT_LABEL, careRequestRulesText } from "@/lib/care-request-disclosures";
import { formatBrasiliaDateTime } from "@/lib/date-time";

export type EmailPayload = {
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
  fixedContractRequested: boolean;
  professional: {
    user: {
      name: string;
      email: string;
    };
  };
};

const serviceLabel: Record<CareService, string> = {
  BANHO: "Banho",
  TRANSFERENCIA: "Transferência",
  MEDICACAO: "Medicação",
  CURATIVOS: "Curativos",
  FISIOTERAPIA: "Fisioterapia",
  COMPANHIA: "Companhia",
  REFEICAO: "Refeição",
  SINAIS_VITAIS: "Sinais vitais",
  AVALIACAO: "Avaliação",
  FORTALECIMENTO: "Fortalecimento",
  OUTRO: "Outro atendimento"
};

const supportLabel: Record<TransferSupportLevel, string> = {
  MODERADO: "Sem preferência de porte físico",
  ALTO: "Porte físico forte",
  DUPLA: "Duas pessoas"
};

const statusLabel: Record<CareRequestStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  ACEITO: "Aceito",
  AGENDADO: "Agendado",
  CONCLUIDO: "Concluído",
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

  return formatBrasiliaDateTime(value);
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
    `Telefone: ${request.requesterPhone || "Não informado"}`,
    `Serviço: ${serviceLabel[request.service]}`,
    `Apoio: ${supportLabel[request.supportNeed]}`,
    `Horário: ${formatDate(request.scheduledFor)}`,
    `Endereço: ${formatAddress(request)}`,
    `Pagamento: ${CARE_REQUEST_PAYMENT_LABEL}`,
    request.fixedContractRequested ? "Rotina fixa: paciente tem interesse em contrato fixo, escala recorrente ou CLT." : "",
    request.notes ? `Observações: ${request.notes}` : "",
    "",
    "Regras principais:",
    careRequestRulesText(),
    `Painel: ${appUrl()}/dashboard`
  ]
    .filter(Boolean)
    .join("\n");
}

function requestDetailsHtml(request: CareRequestNotificationData) {
  const rows = [
    ["Paciente", request.requesterName],
    ["Telefone", request.requesterPhone || "Não informado"],
    ["Serviço", serviceLabel[request.service]],
    ["Apoio", supportLabel[request.supportNeed]],
    ["Horário", formatDate(request.scheduledFor)],
    ["Endereço", formatAddress(request)],
    ["Pagamento", CARE_REQUEST_PAYMENT_LABEL],
    ["Rotina fixa", request.fixedContractRequested ? "Paciente tem interesse em contrato fixo, escala recorrente ou CLT." : "Não informado"],
    ["Observações", request.notes || "Sem observações"]
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
      <div style="margin:16px 0 0;padding:12px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px">
        <p style="margin:0 0 8px;font-weight:700">Regras principais</p>
        <p style="margin:0;white-space:pre-line">${escapeHtml(careRequestRulesText())}</p>
      </div>
      <p style="margin:16px 0 0">
        <a href="${appUrl()}/dashboard" style="color:#047857;font-weight:700">Abrir painel</a>
      </p>
    </div>
  `;
}

export function isEmailNotificationsConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail(input: EmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { ok: false as const, skipped: true as const, error: "Notificações por e-mail não configuradas." };
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

export async function sendEmailConfigurationTest(primaryRecipient: string) {
  const recipients = Array.from(new Set([primaryRecipient, ...parseEmails(process.env.CARE_ADMIN_EMAILS)].filter(Boolean)));

  if (recipients.length === 0) {
    return { ok: false as const, skipped: true as const, error: "Nenhum destinatário configurado para teste." };
  }

  return sendEmail({
    to: recipients,
    subject: "Teste CuidarLink - notificações por e-mail",
    text: [
      "CuidarLink: este e-mail confirma que o envio de notificações está funcionando.",
      "",
      `Painel: ${appUrl()}/admin`
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
        <h1 style="font-size:20px;margin:0 0 12px">CuidarLink</h1>
        <p>Este e-mail confirma que o envio de notificações está funcionando.</p>
        <p style="margin:16px 0 0">
          <a href="${appUrl()}/admin" style="color:#047857;font-weight:700">Abrir painel admin</a>
        </p>
      </div>
    `
  });
}

export async function sendCareMessageNotification(input: {
  to: string;
  senderName: string;
  requestId: string;
  serviceLabel: string;
  body: string;
}) {
  const url = `${appUrl()}/dashboard/atendimentos/${input.requestId}#mensagens`;
  const subject = `Nova mensagem no atendimento: ${input.serviceLabel}`;
  const preview = input.body.length > 500 ? `${input.body.slice(0, 500)}...` : input.body;

  return sendEmail({
    to: input.to,
    subject,
    text: [
      `${input.senderName} enviou uma mensagem sobre o atendimento de ${input.serviceLabel}.`,
      "",
      preview,
      "",
      `Responder: ${url}`
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
        <h1 style="font-size:20px;margin:0 0 12px">Nova mensagem no atendimento</h1>
        <p><strong>${escapeHtml(input.senderName)}</strong> enviou uma mensagem sobre o atendimento de <strong>${escapeHtml(input.serviceLabel)}</strong>.</p>
        <div style="margin:16px 0;padding:12px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;white-space:pre-line">${escapeHtml(preview)}</div>
        <p style="margin:16px 0 0">
          <a href="${url}" style="color:#047857;font-weight:700">Abrir conversa</a>
        </p>
      </div>
    `
  });
}

export async function sendProfessionalInquiryNotification(input: {
  to: string;
  professionalName: string;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  inquiryId: string;
  body: string;
}) {
  const url = `${appUrl()}/dashboard/mensagens/${input.inquiryId}`;
  const subject = `Nova mensagem antes do pedido: ${input.requesterName}`;
  const preview = input.body.length > 500 ? `${input.body.slice(0, 500)}...` : input.body;

  return sendEmail({
    to: input.to,
    subject,
    text: [
      `${input.requesterName} enviou uma dúvida antes de solicitar atendimento.`,
      input.requesterEmail ? `E-mail: ${input.requesterEmail}` : "",
      input.requesterPhone ? `Telefone: ${input.requesterPhone}` : "",
      "",
      preview,
      "",
      `Responder no painel: ${url}`
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
        <h1 style="font-size:20px;margin:0 0 12px">Nova mensagem antes do pedido</h1>
        <p><strong>${escapeHtml(input.requesterName)}</strong> enviou uma dúvida para <strong>${escapeHtml(input.professionalName)}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#475569;font-weight:700">E-mail</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(input.requesterEmail || "Não informado")}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#475569;font-weight:700">Telefone</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(input.requesterPhone || "Não informado")}</td>
          </tr>
        </table>
        <div style="margin:16px 0;padding:12px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;white-space:pre-line">${escapeHtml(preview)}</div>
        <p style="margin:16px 0 0">
          <a href="${url}" style="color:#047857;font-weight:700">Responder no painel</a>
        </p>
      </div>
    `
  });
}

export async function sendProfessionalInquiryReplyNotification(input: {
  to: string;
  senderName: string;
  professionalName: string;
  inquiryId: string;
  body: string;
}) {
  const url = `${appUrl()}/dashboard/mensagens/${input.inquiryId}`;
  const subject = `Resposta da conversa com ${input.professionalName}`;
  const preview = input.body.length > 500 ? `${input.body.slice(0, 500)}...` : input.body;

  return sendEmail({
    to: input.to,
    subject,
    text: [
      `${input.senderName} enviou uma resposta na conversa com ${input.professionalName}.`,
      "",
      preview,
      "",
      `Abrir conversa: ${url}`
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
        <h1 style="font-size:20px;margin:0 0 12px">Nova resposta na conversa</h1>
        <p><strong>${escapeHtml(input.senderName)}</strong> enviou uma resposta na conversa com <strong>${escapeHtml(input.professionalName)}</strong>.</p>
        <div style="margin:16px 0;padding:12px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:8px;white-space:pre-line">${escapeHtml(preview)}</div>
        <p style="margin:16px 0 0">
          <a href="${url}" style="color:#047857;font-weight:700">Abrir conversa</a>
        </p>
      </div>
    `
  });
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
  const subject = `Atualização do atendimento: ${status}`;
  const text = [
    `O atendimento com ${request.professional.user.name} foi atualizado para: ${status}.`,
    "",
    requestDetailsText(request)
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h1 style="font-size:20px;margin:0 0 12px">Atualização do atendimento</h1>
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
