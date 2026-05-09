import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { subscriptionPlans } from "@/lib/subscription-plans";

export function PricingCards() {
  return (
    <section className="surface space-y-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-700">Modelo comercial</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">Planos preparados para o CuidarLink</h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          O MVP segue gratuito para validar busca, documentos, mensagens e pedidos. A camada premium fica preparada para
          quando a plataforma tiver dominio, regras finais e pagamento online.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {subscriptionPlans.map((plan) => (
            <article
              key={plan.tier}
              className={`rounded-lg border p-5 ${
                plan.highlight ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-500">{plan.name}</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  {plan.statusLabel}
                </span>
              </div>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">{plan.priceLabel}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{plan.shortDescription}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {plan.publicFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="mt-6">
                <Link href="/register" className={buttonStyles(plan.highlight ? "primary" : "secondary")}>
                  Criar perfil
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
