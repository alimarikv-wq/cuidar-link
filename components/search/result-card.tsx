"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SearchResult } from "@/types";
import { formatDateShort, formatMiles, formatMoney } from "@/lib/utils";

export function ResultCard({ result, isBest }: { result: SearchResult; isBest: boolean }) {
  async function saveFavorite() {
    await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId: result.id })
    });
  }

  async function createAlert() {
    await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId: result.id, targetMiles: Math.round(result.milesRequired * 0.9) })
    });
  }

  return (
    <article className="rounded-[30px] border border-white/10 bg-white px-5 py-5 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              {result.programLabel}
            </span>
            {isBest ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Melhor custo-beneficio
              </span>
            ) : null}
          </div>
          <h3 className="mt-4 text-3xl font-semibold text-slate-950">{formatMiles(result.milesRequired)} milhas</h3>
          <p className="mt-2 text-sm text-slate-600">
            {result.origin} para {result.destination} • ida {formatDateShort(result.departureDate)}
            {result.returnDate ? ` • volta ${formatDateShort(result.returnDate)}` : ""}
          </p>
        </div>

        <div className="grid gap-3 text-right">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Taxas</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(result.taxesAmount)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Cash equivalente</p>
            <p className="mt-1 text-xl font-semibold">{formatMoney(result.cashPrice)}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[24px] bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">Historico de preco em milhas</p>
            <p className="text-xs text-slate-400">{result.history.length} pontos</p>
          </div>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={result.history}>
                <defs>
                  <linearGradient id={`fill-${result.id}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0057ff" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#0057ff" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis hide />
                <Tooltip formatter={(value: number) => `${formatMiles(value)} milhas`} />
                <Area dataKey="miles" stroke="#0057ff" fill={`url(#fill-${result.id})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[24px] bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Valor por milha</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{result.valuePerMile.toFixed(3)}</p>
            <p className="mt-1 text-sm text-slate-500">Maior valor tende a indicar melhor troca.</p>
          </div>
          <div className="rounded-[24px] bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Links e acoes</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={saveFavorite} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
                Favoritar
              </button>
              <button onClick={createAlert} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">
                Alerta
              </button>
              {result.affiliateUrl ? (
                <a
                  href={result.affiliateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold"
                >
                  Link afiliado
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
