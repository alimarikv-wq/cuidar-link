import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de Privacidade",
  description: "Como o CuidarLink trata dados de pacientes, familiares e profissionais."
};

const privacySections = [
  {
    title: "Dados que podemos coletar",
    body:
      "Dados de cadastro, contato, login, foto de perfil, localizacao aproximada, endereco de atendimento, preferencias de cuidado, observacoes de seguranca, mensagens, pedidos, agenda, documentos profissionais e registros administrativos."
  },
  {
    title: "Finalidade do uso",
    body:
      "Usamos os dados para criar conta, autenticar usuarios, buscar profissionais proximos, registrar pedidos, enviar notificacoes, revisar documentos, melhorar seguranca e permitir acompanhamento pelo painel."
  },
  {
    title: "Documentos profissionais",
    body:
      "Documentos enviados por profissionais devem ficar em armazenamento privado e com acesso restrito a administradores autorizados. A finalidade e validar cadastro profissional e manter historico de revisao."
  },
  {
    title: "Dados sensiveis e cuidado domiciliar",
    body:
      "Informacoes sobre mobilidade, apoio fisico, banho, transferencia, equipamentos e condicoes de atendimento podem revelar dados sensiveis. Elas devem ser usadas apenas para preparar o atendimento com seguranca."
  },
  {
    title: "Compartilhamento necessario",
    body:
      "Alguns dados do pedido podem ser compartilhados entre paciente e profissional escolhido, como nome, contato, endereco do atendimento, horario, observacoes e detalhes essenciais para prestacao do cuidado."
  },
  {
    title: "Seguranca e acesso",
    body:
      "A plataforma utiliza sessoes autenticadas, armazenamento privado para documentos e registro de acoes administrativas. Usuarios devem proteger suas senhas e evitar compartilhar dados sensiveis fora dos canais combinados."
  },
  {
    title: "Retencao e revisao",
    body:
      "Dados podem ser mantidos enquanto houver conta ativa, pedidos, auditoria, obrigacao legal ou necessidade de seguranca. Solicitacoes de correcao ou remocao devem ser avaliadas conforme obrigacoes legais e operacionais."
  },
  {
    title: "Base para lancamento",
    body:
      "Esta politica e uma base operacional para testes e MVP. Antes do lancamento publico definitivo, recomenda-se revisao juridica de LGPD, bases legais, direitos do titular, encarregado e canais formais de atendimento."
  }
];

export default function PrivacyPage() {
  return (
    <div className="surface mx-auto max-w-4xl space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">CuidarLink</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Politica de Privacidade</h1>
        <p className="mt-4 text-sm leading-7 text-slate-700">
          Esta politica resume como o CuidarLink trata dados pessoais em um contexto de cuidado domiciliar, onde clareza e privacidade
          sao especialmente importantes.
        </p>
      </section>

      <section className="grid gap-3">
        {privacySections.map((section) => (
          <article key={section.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">{section.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
