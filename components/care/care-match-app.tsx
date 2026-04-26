"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  CalendarClock,
  Check,
  ClipboardCheck,
  HeartHandshake,
  LocateFixed,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Stethoscope,
  UserRound,
  Weight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AvailabilityFilter,
  CareProfessional,
  CareSearchResponse,
  CareServiceCode,
  GenderPreferenceCode,
  ProfessionalTypeCode,
  TransferSupportCode
} from "@/types";

type ProfessionalTypeFilter = "TODOS" | ProfessionalTypeCode;

const serviceOptions: Array<{ id: CareServiceCode; label: string; icon: typeof HeartHandshake }> = [
  { id: "BANHO", label: "Banho", icon: HeartHandshake },
  { id: "TRANSFERENCIA", label: "Transferencia", icon: Weight },
  { id: "MEDICACAO", label: "Medicacao", icon: Stethoscope },
  { id: "FISIOTERAPIA", label: "Fisioterapia", icon: Accessibility }
];

const professionalTypes: Array<{ value: ProfessionalTypeFilter; label: string }> = [
  { value: "TODOS", label: "Todos" },
  { value: "CUIDADOR", label: "Cuidador" },
  { value: "TECNICO_ENFERMAGEM", label: "Tecnico" },
  { value: "FISIOTERAPEUTA", label: "Fisio" }
];

const genderOptions: Array<{ value: GenderPreferenceCode; label: string }> = [
  { value: "FEMININO", label: "Mulher" },
  { value: "QUALQUER", label: "Qualquer" },
  { value: "MASCULINO", label: "Homem" }
];

const supportOptions: Array<{ value: TransferSupportCode; label: string }> = [
  { value: "MODERADO", label: "Moderado" },
  { value: "ALTO", label: "Alto" },
  { value: "DUPLA", label: "Duas pessoas" }
];

const availabilityOptions: Array<{ value: AvailabilityFilter; label: string }> = [
  { value: "qualquer", label: "Qualquer horario" },
  { value: "agora", label: "Agora" },
  { value: "hoje", label: "Hoje" },
  { value: "manha", label: "Manha" },
  { value: "tarde", label: "Tarde" },
  { value: "noite", label: "Noite" },
  { value: "fim-de-semana", label: "Fim de semana" }
];

const emptyCenter = {
  city: "Porto Alegre",
  neighborhood: "Zona Sul",
  latitude: -30.111947,
  longitude: -51.256708
};

function getDefaultScheduledFor() {
  const scheduled = new Date();
  scheduled.setDate(scheduled.getDate() + 1);
  scheduled.setHours(14, 30, 0, 0);

  const localDate = new Date(scheduled.getTime() - scheduled.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function CareMatchApp() {
  const [service, setService] = useState<CareServiceCode>("BANHO");
  const [professionalType, setProfessionalType] = useState<ProfessionalTypeFilter>("TODOS");
  const [genderPreference, setGenderPreference] = useState<GenderPreferenceCode>("FEMININO");
  const [supportNeed, setSupportNeed] = useState<TransferSupportCode>("ALTO");
  const [availability, setAvailability] = useState<AvailabilityFilter>("qualquer");
  const [radius, setRadius] = useState(8);
  const [searchVersion, setSearchVersion] = useState(0);
  const [results, setResults] = useState<CareProfessional[]>([]);
  const [center, setCenter] = useState(emptyCenter);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataWarning, setDataWarning] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestWarning, setRequestWarning] = useState("");
  const [requestPending, setRequestPending] = useState(false);
  const [requesterName, setRequesterName] = useState("Joao Paciente");
  const [requesterPhone, setRequesterPhone] = useState("(51) 99999-0101");
  const [addressLine, setAddressLine] = useState("Zona Sul, Porto Alegre");
  const [neighborhood, setNeighborhood] = useState("Tristeza");
  const [scheduledFor, setScheduledFor] = useState(getDefaultScheduledFor);
  const [notes, setNotes] = useState("Preciso de banho assistido e transferencia segura cadeira-cama.");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      service,
      genderPreference,
      supportNeed,
      availability,
      radiusKm: String(radius),
      latitude: String(center.latitude),
      longitude: String(center.longitude)
    });

    if (professionalType !== "TODOS") {
      params.set("professionalType", professionalType);
    }

    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError("");
    });

    fetch(`/api/professionals?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as CareSearchResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Nao foi possivel buscar profissionais.");
        }
        setResults(data.results);
        setCenter(data.center);
        setDataWarning(data.warning || "");
        setSelectedId((current) => (data.results.some((professional) => professional.id === current) ? current : data.results[0]?.id || ""));
      })
      .catch((fetchError: Error) => {
        if (controller.signal.aborted) return;
        setResults([]);
        setDataWarning("");
        setError(fetchError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [availability, center.latitude, center.longitude, genderPreference, professionalType, radius, searchVersion, service, supportNeed]);

  const selected = useMemo(() => {
    return results.find((professional) => professional.id === selectedId) ?? results[0] ?? null;
  }, [results, selectedId]);

  function selectProfessional(id: string) {
    setSelectedId(id);
    setRequestSent(false);
    setRequestError("");
  }

  async function submitRequest() {
    if (!selected) return;
    setRequestPending(true);
    setRequestError("");
    setRequestWarning("");
    setRequestSent(false);

    const response = await fetch("/api/care-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId: selected.id,
        requesterName,
        requesterPhone,
        service,
        supportNeed,
        preferredGender: genderPreference,
        scheduledFor,
        durationHours: 2,
        addressLine,
        neighborhood,
        city: center.city,
        latitude: center.latitude,
        longitude: center.longitude,
        notes
      })
    });

    const data = await response.json();
    setRequestPending(false);

    if (!response.ok) {
      setRequestError(data.error || "Nao foi possivel enviar a solicitacao.");
      return;
    }

    setRequestWarning(data.warning || "");
    setRequestSent(true);
  }

  return (
    <div className="surface space-y-6">
      <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="request-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Paciente PCD</p>
              <h1 id="request-title" className="mt-1 text-3xl font-semibold leading-tight text-slate-950">
                Cuidado domiciliar perto de voce
              </h1>
            </div>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <Accessibility aria-hidden="true" className="h-6 w-6" />
            </span>
          </div>

          <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
              <LocateFixed aria-hidden="true" className="h-4 w-4" />
              {center.neighborhood}, {center.city}
            </div>
            <p className="mt-1 text-sm text-emerald-900">Busca com geolocalizacao persistida no banco.</p>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-800" htmlFor="professional-type">
                Profissional
              </label>
              <select
                id="professional-type"
                value={professionalType}
                onChange={(event) => setProfessionalType(event.target.value as ProfessionalTypeFilter)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                {professionalTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">Preciso de ajuda com</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {serviceOptions.map((option) => {
                  const Icon = option.icon;
                  const active = service === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setService(option.id)}
                      className={`flex h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${
                        active
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">Preferencia no cuidado intimo</p>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Preferencia no cuidado intimo">
                {genderOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGenderPreference(option.value)}
                    className={`h-11 rounded-lg border px-2 text-sm font-semibold transition ${
                      genderPreference === option.value
                        ? "border-violet-700 bg-violet-700 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-800">Capacidade para transferencia</p>
              <div className="mt-2 grid gap-2">
                {supportOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSupportNeed(option.value)}
                    className={`flex h-11 items-center justify-between rounded-lg border px-3 text-sm font-semibold transition ${
                      supportNeed === option.value
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {option.label}
                    {supportNeed === option.value ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="availability">
                  Disponibilidade
                </label>
                <select
                  id="availability"
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)}
                  className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                >
                  {availabilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="radius">
                    Raio de busca
                  </label>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">{radius} km</span>
                </div>
                <input
                  id="radius"
                  type="range"
                  min={2}
                  max={20}
                  step={1}
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                  className="mt-3 w-full accent-emerald-700"
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setSearchVersion((current) => current + 1)}
              className="h-12 w-full gap-2 bg-emerald-700 hover:bg-emerald-800"
              disabled={loading}
            >
              <Search aria-hidden="true" className="h-4 w-4" />
              {loading ? "Buscando..." : "Atualizar busca"}
            </Button>
          </div>
        </aside>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Profissionais proximos</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                    {loading ? "Buscando..." : `${results.length} ${results.length === 1 ? "opcao encontrada" : "opcoes encontradas"}`}
                  </h2>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                  <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                  Ordenado por compatibilidade
                </div>
              </div>

              <div className="mt-4 h-56 overflow-hidden rounded-lg border border-slate-200 bg-[#f6f8f4]">
                <div className="relative h-full w-full">
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[length:46px_46px]" />
                  <div className="absolute left-5 top-5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm">
                    {center.neighborhood}
                  </div>
                  <div className="absolute bottom-5 left-10 h-24 w-52 rounded-full border-2 border-emerald-400 bg-emerald-200/30" />
                  <div className="absolute right-8 top-8 h-28 w-44 rounded-full border-2 border-violet-300 bg-violet-200/30" />
                  {results.map((professional, index) => (
                    <button
                      key={professional.id}
                      type="button"
                      onClick={() => selectProfessional(professional.id)}
                      title={`${professional.name}, ${professional.distanceKm} km`}
                      className={`absolute grid h-9 w-9 place-items-center rounded-lg border text-white shadow-sm transition ${
                        selected?.id === professional.id ? "border-white bg-violet-700" : "border-white bg-emerald-700"
                      }`}
                      style={{
                        left: `${18 + ((index * 17) % 64)}%`,
                        top: `${25 + ((index * 23) % 48)}%`
                      }}
                    >
                      <MapPin aria-hidden="true" className="h-5 w-5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}

            {dataWarning ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">{dataWarning}</div>
            ) : null}

            {!loading && !error && results.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                Nenhum profissional bate com todos os filtros. Amplie o raio ou troque a disponibilidade.
              </div>
            ) : null}

            <div className="grid gap-3">
              {results.map((professional) => (
                <article
                  key={professional.id}
                  className={`rounded-lg border bg-white p-4 shadow-sm transition ${
                    selected?.id === professional.id ? "border-emerald-600 ring-2 ring-emerald-100" : "border-slate-200"
                  }`}
                >
                  <div className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)_160px]">
                    <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-slate-100">
                      {professional.photoUrl ? (
                        <Image src={professional.photoUrl} alt={professional.name} fill sizes="96px" className="object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-400">
                          <UserRound aria-hidden="true" className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-slate-950">{professional.name}</h3>
                        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                          {professional.matchScore}% match
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {professional.age} anos
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-700">{professional.roleLabel}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin aria-hidden="true" className="h-4 w-4 text-emerald-700" />
                          {professional.neighborhood}, {professional.distanceKm.toFixed(1)} km
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {professional.rating} ({professional.reviewCount})
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock aria-hidden="true" className="h-4 w-4 text-violet-700" />
                          {professional.availableIn}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{professional.mobilitySupport}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {professional.credentials.slice(0, 3).map((credential) => (
                          <span key={credential} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                            {credential}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-3 md:items-end">
                      <div className="md:text-right">
                        <p className="text-sm text-slate-500">A partir de</p>
                        <p className="text-2xl font-semibold text-slate-950">{professional.priceLabel}</p>
                        <p className="mt-1 text-sm text-slate-500">responde em {professional.responseTimeLabel}</p>
                      </div>
                      <div className="flex gap-2 md:flex-col">
                        <Button
                          type="button"
                          onClick={() => selectProfessional(professional.id)}
                          className="h-10 gap-2 bg-slate-950 hover:bg-slate-800"
                        >
                          <UserRound aria-hidden="true" className="h-4 w-4" />
                          Selecionar
                        </Button>
                        <Button type="button" variant="secondary" className="h-10 gap-2">
                          <MessageCircle aria-hidden="true" className="h-4 w-4" />
                          Mensagem
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-24 xl:self-start">
            {selected ? (
              <div>
                <div className="relative h-44 overflow-hidden rounded-lg bg-slate-100">
                  {selected.photoUrl ? (
                    <Image src={selected.photoUrl} alt={selected.name} fill sizes="360px" className="object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-slate-400">
                      <UserRound aria-hidden="true" className="h-10 w-10" />
                    </div>
                  )}
                  {selected.isVerified ? (
                    <div className="absolute left-3 top-3 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-800">
                      Verificada
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-emerald-700">{selected.roleLabel}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">{selected.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{selected.bio}</p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-200 py-4">
                  <div>
                    <p className="text-sm text-slate-500">Distancia</p>
                    <p className="font-semibold text-slate-950">{selected.distanceKm.toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Chegada</p>
                    <p className="font-semibold text-slate-950">{selected.availableIn}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Avaliacao</p>
                    <p className="font-semibold text-slate-950">{selected.rating}/5</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Cuidado</p>
                    <p className="font-semibold text-slate-950">{selected.genderLabel}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {selected.credentials.map((credential) => (
                    <div key={credential} className="flex items-center gap-2 text-sm text-slate-700">
                      <ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-700" />
                      {credential}
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3">
                  <input
                    value={requesterName}
                    onChange={(event) => setRequesterName(event.target.value)}
                    placeholder="Nome do paciente"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600"
                  />
                  <input
                    value={requesterPhone}
                    onChange={(event) => setRequesterPhone(event.target.value)}
                    placeholder="Telefone"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600"
                  />
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(event) => setScheduledFor(event.target.value)}
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600"
                  />
                  <input
                    value={addressLine}
                    onChange={(event) => setAddressLine(event.target.value)}
                    placeholder="Endereco"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600"
                  />
                  <input
                    value={neighborhood}
                    onChange={(event) => setNeighborhood(event.target.value)}
                    placeholder="Bairro"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-600"
                  />
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Observacoes de seguranca"
                    className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                {requestSent ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                    {requestWarning || `Pedido gravado no banco para ${selected.name}.`}
                    <span className="block pt-1">A proxima etapa e confirmar horario, endereco e combinados de seguranca.</span>
                  </div>
                ) : null}

                {requestError ? <div className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{requestError}</div> : null}

                <div className="mt-4 grid gap-2">
                  <Button
                    type="button"
                    onClick={submitRequest}
                    disabled={requestPending}
                    className="h-12 gap-2 bg-emerald-700 hover:bg-emerald-800"
                  >
                    <CalendarClock aria-hidden="true" className="h-4 w-4" />
                    {requestPending ? "Enviando..." : "Solicitar atendimento"}
                  </Button>
                  <Button type="button" variant="secondary" className="h-12 gap-2">
                    <Phone aria-hidden="true" className="h-4 w-4" />
                    Ligar para triagem
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-600">Selecione um profissional para ver detalhes.</div>
            )}
          </aside>
        </div>
      </section>

      <section id="seguranca" className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ClipboardCheck aria-hidden="true" className="h-6 w-6 text-emerald-700" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950">Triagem objetiva</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O pedido registra peso aproximado, mobilidade, equipamentos, endereco e privacidade antes do aceite.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <ShieldCheck aria-hidden="true" className="h-6 w-6 text-violet-700" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950">Credenciais checadas</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            COREN, CREFITO, referencias, documentos e historico de atendimento ficam ligados ao perfil profissional.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <HeartHandshake aria-hidden="true" className="h-6 w-6 text-rose-700" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950">Contratacao segura</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Solicitacao, agenda, avaliacao e recorrencia semanal agora tem base para persistencia no banco.
          </p>
        </div>
      </section>
    </div>
  );
}
