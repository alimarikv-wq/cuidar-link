import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de Cookies",
  description: "Uso de cookies essenciais, autenticacao e medicao no CuidarLink."
};

const cookieSections = [
  {
    title: "Cookies essenciais",
    body:
      "Usamos cookies essenciais para manter sessao de login, seguranca da autenticacao e funcionamento basico da conta. Sem eles, o painel, os pedidos e o acesso administrativo nao funcionam corretamente."
  },
  {
    title: "Cookies de terceiros",
    body:
      "Login com Google e outros provedores podem usar cookies proprios fora do controle direto do CuidarLink. Esses provedores seguem suas proprias politicas de privacidade e seguranca."
  },
  {
    title: "Analiticos e marketing",
    body:
      "Ferramentas analiticas ou de marketing devem ser adicionadas apenas quando houver configuracao adequada, aviso claro e, quando necessario, consentimento do usuario."
  },
  {
    title: "Controle pelo navegador",
    body:
      "O usuario pode limpar ou bloquear cookies nas configuracoes do navegador. Isso pode encerrar a sessao ou impedir alguns recursos autenticados."
  }
];

export default function CookiesPage() {
  return (
    <div className="surface mx-auto max-w-4xl space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">CuidarLink</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Politica de Cookies</h1>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Esta politica explica o uso de cookies e tecnologias semelhantes para manter a plataforma funcionando com seguranca.
        </p>
      </section>

      <section className="grid gap-3">
        {cookieSections.map((section) => (
          <article key={section.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">{section.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
