export default function PrivacyPage() {
  return (
    <section className="surface mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-emerald-700">CuidarLink</p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-950">Politica de Privacidade</h1>
      <div className="mt-5 space-y-4 text-sm leading-7 text-slate-700">
        <p>
          Coletamos dados de cadastro, contato, localizacao aproximada, necessidades de cuidado e documentos profissionais para
          viabilizar busca, triagem, seguranca e solicitacoes de atendimento.
        </p>
        <p>
          Dados sensiveis devem ser tratados com acesso restrito, registro de finalidade e medidas tecnicas de protecao. O uso em
          producao deve seguir LGPD e boas praticas de seguranca.
        </p>
        <p>
          Esta versao e uma base operacional e deve receber revisao juridica antes do lancamento publico definitivo.
        </p>
      </div>
    </section>
  );
}
