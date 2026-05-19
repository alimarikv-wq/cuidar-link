import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { buttonStyles } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getCareDashboardData } from "@/lib/care-data";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="surface rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-4xl font-semibold text-slate-950">Seu painel de cuidado</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Entre para ver solicitações, agenda, perfil e documentos em uma visão única.
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

  const dashboard = await getCareDashboardData(user.id);
  return <DashboardShell dashboard={dashboard} />;
}
