import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  HeartHandshake,
  MailCheck,
  MapPin,
  Plane,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

const requestRules = [
  {
    title: "Pedido enviado nao e atendimento confirmado",
    body: "Depois que o paciente envia o pedido, o profissional ainda precisa aceitar ou agendar. Ate isso acontecer, trate o atendimento como pendente.",
    icon: CalendarCheck
  },
  {
    title: "Dados completos ajudam a evitar erro",
    body: "Nome, telefone, e-mail, data, horario, duracao, endereco e observacoes de seguranca devem ser preenchidos com cuidado antes do envio.",
    icon: ClipboardCheck
  },
  {
    title: "Confirme por contato direto",
    body: "Antes do deslocamento, paciente e profissional devem confirmar horario, endereco, necessidade de apoio fisico, equipamentos e combinados finais.",
    icon: MailCheck
  }
];

const safetyRules = [
  "Use o painel para acompanhar status do pedido: enviado, aceito, agendado, concluido ou cancelado.",
  "Nao compartilhe senhas, codigos de acesso ou dados bancarios sensiveis pelo chat, e-mail ou telefone.",
  "Se houver urgencia ou emergencia medica, procure atendimento de emergencia. A plataforma nao substitui servico de urgencia.",
  "Profissionais devem manter documentos, registro profissional, disponibilidade e dados de contato atualizados.",
  "Pacientes devem informar riscos importantes: transferencia, banho assistido, equipamentos, escadas, pets, alergias, sondas ou outras condicoes relevantes.",
  "Quando o cuidado envolver intimidade, privacidade ou transferencia, combine previamente quem estara no local e quais limites devem ser respeitados."
];

const travelRules = [
  {
    title: "Viagem exige aceite especifico",
    body: "Somente profissionais que marcaram disponibilidade para viagens aparecem como opcoes para esse tipo de pedido.",
    icon: Plane
  },
  {
    title: "Documentos de viagem devem ser alinhados",
    body: "Para viagem internacional, confirme passaporte, visto quando necessario, datas, hospedagem, deslocamento e responsabilidades antes de fechar.",
    icon: ShieldCheck
  },
  {
    title: "Custos extras precisam ser combinados",
    body: "Passagem, hospedagem, alimentacao, deslocamento, pernoite e horas excedentes devem ser combinados diretamente antes da viagem.",
    icon: CreditCard
  }
];

export default function SecurityPage() {
  return (
    <div className="surface mx-auto max-w-5xl space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-emerald-700">Seguranca e regras de atendimento</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Como usar o CuidarLink com mais clareza</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Estas regras ajudam paciente, familiar e profissional a entenderem o fluxo do pedido. Elas tambem reduzem combinados confusos,
          principalmente em banho assistido, transferencia, enfermagem, fisioterapia e acompanhamento em viagem.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/#busca" className={buttonStyles()}>
            Buscar profissional
          </Link>
          <Link href="/terms" className={buttonStyles("secondary")}>
            Ver termos de uso
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {requestRules.map((rule) => {
          const Icon = rule.icon;
          return (
            <article key={rule.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Icon aria-hidden="true" className="h-6 w-6 text-emerald-700" />
              <h2 className="mt-3 text-lg font-semibold text-slate-950">{rule.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{rule.body}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <UserRoundCheck aria-hidden="true" className="mt-1 h-6 w-6 text-emerald-700" />
          <div>
            <p className="text-sm font-semibold text-emerald-700">Fluxo recomendado</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Do pedido ao atendimento</h2>
          </div>
        </div>
        <ol className="mt-5 grid gap-3 text-sm leading-7 text-slate-700 md:grid-cols-2">
          <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <span className="font-semibold text-slate-950">1. Paciente escolhe o profissional.</span>
            <span className="block">A busca pode considerar proximidade, tipo de cuidado, horario, porte fisico, idade, genero e viagem.</span>
          </li>
          <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <span className="font-semibold text-slate-950">2. Paciente envia o pedido.</span>
            <span className="block">O sistema grava a solicitacao e avisa o profissional. O atendimento ainda nao esta confirmado.</span>
          </li>
          <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <span className="font-semibold text-slate-950">3. Profissional responde.</span>
            <span className="block">Ele pode aceitar, agendar, cancelar ou concluir depois do atendimento realizado.</span>
          </li>
          <li className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <span className="font-semibold text-slate-950">4. Paciente acompanha no painel.</span>
            <span className="block">Status, notificacoes e historico ficam registrados para consulta posterior.</span>
          </li>
        </ol>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-1 h-6 w-6 text-violet-700" />
            <div>
              <p className="text-sm font-semibold text-violet-700">Boas praticas</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">Antes de confirmar</h2>
            </div>
          </div>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
            {safetyRules.map((rule) => (
              <li key={rule} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-700" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-1 h-6 w-6 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Pagamento</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">Como tratar valores nesta fase</h2>
            </div>
          </div>
          <div className="mt-5 space-y-4 text-sm leading-7 text-amber-950">
            <p>
              Nesta versao, o CuidarLink nao processa pagamento online. Valores, formas de pagamento, deslocamento e horas extras devem ser
              combinados diretamente entre paciente e profissional.
            </p>
            <p>
              Para evitar confusao, confirme o valor antes do atendimento e registre no pedido qualquer detalhe importante. Em atendimentos
              longos ou recorrentes, combine tambem intervalo, alimentacao, pernoite e cancelamento.
            </p>
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <MapPin aria-hidden="true" className="mt-1 h-6 w-6 text-emerald-700" />
          <div>
            <p className="text-sm font-semibold text-emerald-700">Viagens e acompanhamento externo</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Quando o cuidado sai de casa</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {travelRules.map((rule) => {
            const Icon = rule.icon;
            return (
              <article key={rule.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <Icon aria-hidden="true" className="h-5 w-5 text-sky-700" />
                <h3 className="mt-3 font-semibold text-slate-950">{rule.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{rule.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-sm leading-7 text-emerald-950">
        <div className="flex items-start gap-3">
          <HeartHandshake aria-hidden="true" className="mt-1 h-6 w-6 text-emerald-700" />
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Resumo simples</h2>
            <p className="mt-2">
              O CuidarLink aproxima paciente e profissional, mas a confirmacao final acontece pelo aceite/agendamento do profissional e pelos
              combinados diretos entre as partes. Use o painel para acompanhar tudo e evite considerar qualquer atendimento como confirmado
              enquanto o status ainda estiver apenas como enviado.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
