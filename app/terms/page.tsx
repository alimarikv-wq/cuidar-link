import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos operacionais do CuidarLink para pacientes, familiares e profissionais de cuidado domiciliar."
};

const sections = [
  {
    title: "1. Finalidade da plataforma",
    body:
      "O CuidarLink aproxima pacientes, familiares e profissionais de cuidado domiciliar. A plataforma ajuda na busca, troca de mensagens, registro de pedidos, documentacao profissional e acompanhamento de status. O atendimento em si e prestado pelo profissional escolhido, nao pela plataforma."
  },
  {
    title: "2. Cadastro e responsabilidade das informacoes",
    body:
      "Pacientes e profissionais devem fornecer informacoes verdadeiras, atualizadas e suficientes para que o atendimento seja avaliado com seguranca. Dados de contato, endereco, agenda, documentos, registro profissional e observacoes de cuidado devem ser mantidos corretos."
  },
  {
    title: "3. Pedido nao significa atendimento confirmado",
    body:
      "Quando o paciente envia um pedido, o profissional ainda precisa aceitar ou agendar. O atendimento so deve ser considerado confirmado quando houver aceite ou agendamento no painel e combinados diretos entre as partes."
  },
  {
    title: "4. Pagamento e valores",
    body:
      "Nesta fase, o CuidarLink nao processa pagamento online. Valores, deslocamento, horas extras, pernoite, alimentacao, viagem e forma de pagamento devem ser combinados diretamente entre paciente e profissional antes do atendimento."
  },
  {
    title: "5. Profissionais e documentos",
    body:
      "A revisao documental ajuda a indicar que houve conferencia administrativa, mas nao substitui verificacoes legais, contratuais, referencias, entrevista, combinados de seguranca e avaliacao direta do paciente ou familiar."
  },
  {
    title: "6. Saude, urgencia e emergencia",
    body:
      "O CuidarLink nao substitui SAMU, hospital, pronto atendimento, medico responsavel ou servicos de urgencia. Em caso de emergencia, procure atendimento emergencial imediatamente."
  },
  {
    title: "7. Conduta e seguranca",
    body:
      "Usuarios devem agir com respeito, clareza e boa-fe. E proibido usar a plataforma para fraudes, assedio, discriminacao, solicitacoes ilegais, compartilhamento indevido de dados ou qualquer uso que coloque pessoas em risco."
  },
  {
    title: "8. Revisao juridica",
    body:
      "Este texto e uma base operacional para MVP e testes. Antes do lancamento publico definitivo, recomenda-se revisao por assessoria juridica, especialmente para adequacao contratual, LGPD, responsabilidade civil e politica de pagamento."
  }
];

export default function TermsPage() {
  return (
    <div className="surface mx-auto max-w-4xl space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">CuidarLink</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Termos de Uso</h1>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Estes termos explicam as regras principais para uso do CuidarLink por pacientes, familiares e profissionais. Eles foram
          escritos para deixar claro o papel da plataforma e os combinados minimos antes de um atendimento domiciliar.
        </p>
      </section>

      <section className="grid gap-3">
        {sections.map((section) => (
          <article key={section.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">{section.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
