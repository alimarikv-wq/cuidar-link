import Link from "next/link";
import { ProfessionalInquiryDetails } from "@/components/dashboard/professional-inquiry-details";
import { buttonStyles } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getProfessionalInquiryDetailsForUser } from "@/lib/care-data";

type ProfessionalInquiryDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProfessionalInquiryDetailsPage({ params }: ProfessionalInquiryDetailsPageProps) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    return (
      <section className="surface rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-4xl font-semibold text-slate-950">Entre para ver esta conversa</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          As mensagens ficam protegidas e aparecem apenas para o paciente, profissional ou administrador autorizado.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className={buttonStyles()}>
            Entrar
          </Link>
          <Link href="/register" className={buttonStyles("secondary")}>
            Criar conta
          </Link>
        </div>
      </section>
    );
  }

  const result = await getProfessionalInquiryDetailsForUser(id, user.id);

  if (!result.ok) {
    return (
      <section className="surface rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-4xl font-semibold text-slate-950">Conversa indisponivel</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">{result.error}</p>
        <div className="mt-8">
          <Link href="/dashboard#mensagens-iniciais" className={buttonStyles("secondary")}>
            Voltar ao painel
          </Link>
        </div>
      </section>
    );
  }

  return <ProfessionalInquiryDetails inquiry={result.inquiry} />;
}
