"use client";

import { useMemo, useState } from "react";
import { PROGRAM_OPTIONS, SearchResult, TripType } from "@/types";
import { Button } from "@/components/ui/button";
import { ResultCard } from "@/components/search/result-card";
import { SkeletonResults } from "@/components/search/skeleton-results";
import { formatMiles } from "@/lib/utils";

const defaultPrograms = PROGRAM_OPTIONS.map((program) => program.value);

export function SearchPanel() {
  const [origin, setOrigin] = useState("GRU");
  const [destination, setDestination] = useState("LIS");
  const [tripType, setTripType] = useState<TripType>("ROUND_TRIP");
  const [departureDate, setDepartureDate] = useState("2026-06-15");
  const [returnDate, setReturnDate] = useState("2026-06-28");
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState<"ECONOMY" | "BUSINESS">("ECONOMY");
  const [flexible, setFlexible] = useState(true);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(defaultPrograms);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bestResult = useMemo(() => {
    return results.reduce<SearchResult | null>((best, current) => {
      if (!best || current.bestValueScore > best.bestValueScore) return current;
      return best;
    }, null);
  }, [results]);

  async function handleSearch() {
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      origin,
      destination,
      tripType,
      departureDate,
      returnDate,
      passengers: String(passengers),
      cabinClass,
      flexible: String(flexible),
      programs: selectedPrograms.join(",")
    });

    const response = await fetch(`/api/search?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Nao foi possivel consultar as ofertas agora.");
      setResults([]);
      setLoading(false);
      return;
    }

    setResults(data.results || []);
    setLoading(false);
  }

  function toggleProgram(program: string) {
    setSelectedPrograms((current) =>
      current.includes(program) ? current.filter((item) => item !== program) : [...current, program]
    );
  }

  return (
    <div className="rounded-[36px] bg-slate-950 p-5 text-white shadow-[0_28px_70px_rgba(15,23,42,0.22)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Pesquisa inteligente</p>
          <h2 className="mt-2 text-2xl font-semibold">Compare milhas em segundos</h2>
        </div>
        <div className="inline-flex rounded-full bg-white/10 p-1">
          <button
            onClick={() => setTripType("ROUND_TRIP")}
            className={`rounded-full px-4 py-2 text-sm ${tripType === "ROUND_TRIP" ? "bg-white text-slate-950" : "text-white/80"}`}
          >
            Ida e volta
          </button>
          <button
            onClick={() => setTripType("ONE_WAY")}
            className={`rounded-full px-4 py-2 text-sm ${tripType === "ONE_WAY" ? "bg-white text-slate-950" : "text-white/80"}`}
          >
            So ida
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <input
          value={origin}
          onChange={(event) => setOrigin(event.target.value.toUpperCase())}
          placeholder="Origem"
          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/45"
        />
        <input
          value={destination}
          onChange={(event) => setDestination(event.target.value.toUpperCase())}
          placeholder="Destino"
          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/45"
        />
        <input
          type="date"
          value={departureDate}
          onChange={(event) => setDepartureDate(event.target.value)}
          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
        />
        <input
          type="date"
          value={returnDate}
          onChange={(event) => setReturnDate(event.target.value)}
          disabled={tripType === "ONE_WAY"}
          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none disabled:opacity-50"
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <input
          type="number"
          min={1}
          max={9}
          value={passengers}
          onChange={(event) => setPassengers(Number(event.target.value))}
          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
        />
        <select
          value={cabinClass}
          onChange={(event) => setCabinClass(event.target.value as "ECONOMY" | "BUSINESS")}
          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none"
        >
          <option value="ECONOMY">Economica</option>
          <option value="BUSINESS">Executiva</option>
        </select>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/85">
          <input type="checkbox" checked={flexible} onChange={(event) => setFlexible(event.target.checked)} />
          Datas flexiveis (+/- 3 dias)
        </label>
      </div>

      <div className="mt-5 rounded-[28px] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/65">Filtros por programa</h3>
          <p className="text-xs text-white/50">{selectedPrograms.length} selecionados</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {PROGRAM_OPTIONS.map((program) => {
            const active = selectedPrograms.includes(program.value);
            return (
              <button
                key={program.value}
                onClick={() => toggleProgram(program.value)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  active ? "bg-white text-slate-950" : "bg-white/10 text-white/80 ring-1 ring-white/12"
                }`}
              >
                {program.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-500">
          Buscar milhas
        </Button>
        {bestResult ? (
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/85">
            Melhor custo-beneficio: {bestResult.programLabel} com {formatMiles(bestResult.milesRequired)} milhas
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-4 rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">Sidebar</p>
          <div className="mt-4 space-y-4 text-sm text-white/80">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-white/55">Trip type</p>
              <p className="mt-2 font-semibold">{tripType === "ROUND_TRIP" ? "Ida e volta" : "So ida"}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-white/55">Passageiros</p>
              <p className="mt-2 font-semibold">{passengers}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-white/55">Classe</p>
              <p className="mt-2 font-semibold">{cabinClass === "BUSINESS" ? "Executiva" : "Economica"}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-white/55">Datas flexiveis</p>
              <p className="mt-2 font-semibold">{flexible ? "Ativadas" : "Desativadas"}</p>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          {loading ? <SkeletonResults /> : null}
          {!loading && results.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              Rode uma busca para ver os cards de resultados com historico de milhas, taxas e botoes de favoritos.
            </div>
          ) : null}
          {!loading &&
            results.map((result) => <ResultCard key={result.id} result={result} isBest={bestResult?.id === result.id} />)}
        </div>
      </div>
    </div>
  );
}
