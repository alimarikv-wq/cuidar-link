export const CARE_REQUEST_RULES_VERSION = "2026-05-03";

export const CARE_REQUEST_PAYMENT_AGREEMENT = "DIRECT_WITH_PROFESSIONAL";

export const CARE_REQUEST_PAYMENT_LABEL = "Pagamento combinado diretamente com o profissional";

export const careRequestRules = [
  {
    title: "Pagamento direto",
    detail: "A CuidarLink ainda nao processa pagamento online. Valores, deslocamento e extras devem ser combinados diretamente com o profissional."
  },
  {
    title: "Nao e emergencia",
    detail: "A plataforma nao substitui SAMU, hospital, pronto atendimento ou servicos de urgencia."
  },
  {
    title: "Pedido depende de confirmacao",
    detail: "O atendimento so deve ser considerado confirmado depois que o profissional aceitar ou agendar no painel."
  },
  {
    title: "Verificacao profissional",
    detail: "O selo indica revisao cadastral e documental, mas nao substitui combinados de seguranca entre paciente, familia e profissional."
  }
];

export function careRequestRulesText() {
  return careRequestRules.map((rule) => `${rule.title}: ${rule.detail}`).join("\n");
}
