import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

const plans = [
  {
    name: "Paciente",
    price: "R$ 0",
    description: "Para buscar profissionais, fazer triagem e solicitar atendimentos avulsos.",
    features: ["Busca por proximidade", "Filtros de cuidado intimo", "Solicitacoes com triagem", "Historico no painel"]
  },
  {
    name: "Profissional",
    price: "Comissao",
    description: "Para cuidadores, tecnicos e fisioterapeutas receberem pedidos qualificados.",
    features: ["Perfil publico", "Documentos verificados", "Agenda de disponibilidade", "Pedidos com endereco e necessidades"]
  }
];

export function PricingCards() {
  return (
    <section className="surface space-y-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-emerald-700">Modelo do MVP</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">Planos para operar o CuidarLink</h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          A base suporta cadastro gratuito, verificacao de profissionais, agenda e monetizacao por comissao ou assinatura.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-lg border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-500">{plan.name}</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">{plan.price}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="mt-6">
                <Link href="/register" className={buttonStyles("secondary")}>
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
