import { AdminShell } from "@/components/dashboard/admin-shell";
import { getCurrentUser } from "@/lib/auth";
import { getCareAdminOverview } from "@/lib/care-data";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return (
      <section className="surface rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <h1 className="text-4xl font-semibold text-slate-950">Admin CuidarLink</h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Esta area mostra pacientes, profissionais, documentos verificados e solicitacoes.
        </p>
        <p className="mt-2 text-sm text-slate-500">Use a conta seed administrativa para acessar.</p>
      </section>
    );
  }

  const overview = await getCareAdminOverview();
  return <AdminShell overview={overview} />;
}
