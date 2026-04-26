"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CareAdminOverview } from "@/types";

const colors = ["#047857", "#6d28d9", "#0f172a", "#be123c", "#0369a1", "#a16207"];

export function AdminShell({ overview }: { overview: CareAdminOverview }) {
  const summaryCards = [
    { label: "Usuarios", value: String(overview.users) },
    { label: "Pacientes", value: String(overview.patients) },
    { label: "Profissionais", value: String(overview.professionals) },
    { label: "Verificados", value: String(overview.verifiedProfessionals) },
    { label: "Pedidos abertos", value: String(overview.openRequests) }
  ];

  return (
    <section className="surface space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</h2>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">Rede profissional</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Distribuicao por tipo</h3>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.professionalsByType}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="count" fill="#047857" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">Solicitacoes</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Status operacional</h3>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={overview.requestsByStatus} dataKey="count" nameKey="label" innerRadius={60} outerRadius={95}>
                  {overview.requestsByStatus.map((entry, index) => (
                    <Cell key={entry.label} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}
