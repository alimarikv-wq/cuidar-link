export type SubscriptionTierCode = "FREE" | "PREMIUM";
export type SubscriptionStatusCode = "ATIVO" | "TRIAL" | "CANCELADO" | "VENCIDO";
export type BillingProviderCode = "MANUAL" | "STRIPE" | "MERCADO_PAGO";

export type SubscriptionPlan = {
  tier: SubscriptionTierCode;
  name: string;
  statusLabel: string;
  priceLabel: string;
  shortDescription: string;
  dashboardDescription: string;
  dashboardFeatures: string[];
  publicFeatures: string[];
  ctaLabel: string;
  ctaHref: string;
  highlight?: boolean;
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    tier: "FREE",
    name: "Gratuito",
    statusLabel: "Ativo",
    priceLabel: "R$ 0",
    shortDescription: "Para testar a busca, salvar profissionais e solicitar atendimentos sem pagamento online.",
    dashboardDescription:
      "Seu acesso gratuito esta ativo. Ele ja cobre busca, favoritos, mensagens, solicitacoes e historico basico.",
    dashboardFeatures: [
      "Busca por proximidade e filtros principais",
      "Favoritos e mensagens antes do atendimento",
      "Solicitacoes com endereco, horario, regras e historico"
    ],
    publicFeatures: [
      "Cadastro de paciente e profissional",
      "Busca por localizacao, filtros e favoritos",
      "Mensagens e pedidos de atendimento",
      "Documentos profissionais verificados pelo admin"
    ],
    ctaLabel: "Ver planos",
    ctaHref: "/pricing"
  },
  {
    tier: "PREMIUM",
    name: "Premium",
    statusLabel: "Preparado",
    priceLabel: "Em breve",
    shortDescription: "Camada futura para pacientes que querem mais filtros, acompanhamento e recursos de recorrencia.",
    dashboardDescription:
      "Base premium preparada. Quando a cobranca for ativada, este plano podera liberar recursos avancados sem mexer no cadastro.",
    dashboardFeatures: [
      "Filtros avancados para recorrencia, viagens e disponibilidade",
      "Atalhos de contato destacados quando o profissional liberar",
      "Historico ampliado e recursos administrativos para acompanhamento"
    ],
    publicFeatures: [
      "Tudo do gratuito",
      "Recorrencia e plantao com filtros mais fortes",
      "Prioridade visual e acompanhamento mais detalhado",
      "Preparado para integracao futura com pagamento"
    ],
    ctaLabel: "Acompanhar premium",
    ctaHref: "/pricing",
    highlight: true
  }
];

export const subscriptionPlanLabels: Record<SubscriptionTierCode, string> = {
  FREE: "Gratuito",
  PREMIUM: "Premium"
};

export const subscriptionStatusLabels: Record<SubscriptionStatusCode, string> = {
  ATIVO: "Ativo",
  TRIAL: "Teste",
  CANCELADO: "Cancelado",
  VENCIDO: "Vencido"
};

export const billingProviderLabels: Record<BillingProviderCode, string> = {
  MANUAL: "Manual / sem cobranca online",
  STRIPE: "Stripe",
  MERCADO_PAGO: "Mercado Pago"
};

export function normalizeSubscriptionTier(tier: string | null | undefined): SubscriptionTierCode {
  return tier === "PREMIUM" ? "PREMIUM" : "FREE";
}

export function normalizeSubscriptionStatus(status: string | null | undefined): SubscriptionStatusCode {
  if (status === "TRIAL" || status === "CANCELADO" || status === "VENCIDO") return status;
  return "ATIVO";
}

export function normalizeBillingProvider(provider: string | null | undefined): BillingProviderCode {
  if (provider === "STRIPE" || provider === "MERCADO_PAGO") return provider;
  return "MANUAL";
}

export function getSubscriptionPlan(tier: string | null | undefined): SubscriptionPlan {
  const normalizedTier = normalizeSubscriptionTier(tier);
  return subscriptionPlans.find((plan) => plan.tier === normalizedTier) || subscriptionPlans[0];
}

export function isSubscriptionUsable(status: string | null | undefined) {
  const normalizedStatus = normalizeSubscriptionStatus(status);
  return normalizedStatus === "ATIVO" || normalizedStatus === "TRIAL";
}
