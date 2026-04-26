export default function CookiesPage() {
  return (
    <section className="surface mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-emerald-700">CuidarLink</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">Politica de Cookies</h1>
      <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
        <p>
          Usamos cookies essenciais para manter sessao de login e seguranca da autenticacao. Esses cookies sao necessarios para o
          funcionamento da conta.
        </p>
        <p>
          Cookies analiticos ou de marketing devem ser adicionados apenas com consentimento e configuracao especifica antes do uso em
          producao.
        </p>
      </div>
    </section>
  );
}
