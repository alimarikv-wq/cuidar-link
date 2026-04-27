"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Apple, BriefcaseMedical, Eye, EyeOff, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CepAddressFields, type CepAddressValue } from "@/components/ui/cep-address-fields";
import { isStrongPassword, validatePassword } from "@/lib/password-policy";

type AccountType = "PATIENT" | "PROFESSIONAL";
type OAuthProviders = {
  google: boolean;
  apple: boolean;
};

const fieldClass =
  "h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const oauthErrorMessages: Record<string, string> = {
  google_config: "Google ainda nao esta configurado. Preencha GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env.",
  apple_config: "Apple ainda nao esta configurado. Preencha as credenciais de Sign in with Apple no .env.",
  oauth_provider: "Provedor OAuth invalido.",
  oauth_state: "A sessao de cadastro expirou. Tente novamente.",
  oauth_callback: "Nao foi possivel concluir o acesso social agora."
};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("PATIENT");
  const [phone, setPhone] = useState("");
  const [neighborhood, setNeighborhood] = useState("Tristeza");
  const [addressLine, setAddressLine] = useState("Zona Sul, Porto Alegre");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("Porto Alegre");
  const [stateCode, setStateCode] = useState("RS");
  const [approximateWeightKg, setApproximateWeightKg] = useState("118");
  const [preferredGender, setPreferredGender] = useState("FEMININO");
  const [transferNeed, setTransferNeed] = useState("ALTO");
  const [mobilityNotes, setMobilityNotes] = useState("");
  const [professionalType, setProfessionalType] = useState("CUIDADOR");
  const [gender, setGender] = useState("FEMININO");
  const [age, setAge] = useState("30");
  const [hourlyRate, setHourlyRate] = useState("50");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<OAuthProviders>({ google: false, apple: false });
  const [showPassword, setShowPassword] = useState(false);
  const [keepConnected, setKeepConnected] = useState(true);
  const passwordRules = validatePassword(password);
  const canSubmitRegister = mode === "login" || isStrongPassword(password);

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get("authError");
    if (!authError) return;

    queueMicrotask(() => {
      setError(oauthErrorMessages[authError] || "Nao foi possivel concluir o acesso social agora.");
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/providers", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: OAuthProviders) => setProviders(data))
      .catch(() => {
        if (!controller.signal.aborted) setProviders({ google: false, apple: false });
      });

    return () => controller.abort();
  }, []);

  function oauthHref(provider: "google" | "apple") {
    const params = new URLSearchParams({ mode });
    if (mode === "register") params.set("accountType", accountType);
    return `/api/auth/oauth/${provider}?${params.toString()}`;
  }

  function updateAddress(nextAddress: CepAddressValue) {
    setPostalCode(nextAddress.postalCode);
    setAddressLine(nextAddress.addressLine);
    setAddressNumber(nextAddress.addressNumber);
    setAddressComplement(nextAddress.addressComplement);
    setNeighborhood(nextAddress.neighborhood);
    setCity(nextAddress.city);
    setStateCode(nextAddress.state);
  }

  function handleSubmit() {
    setError("");

    startTransition(async () => {
      const addressPayload = {
        phone,
        neighborhood,
        addressLine,
        addressNumber,
        addressComplement,
        postalCode,
        city,
        state: stateCode
      };
      const registerPayload =
        accountType === "PROFESSIONAL"
          ? {
              name,
              email,
              password,
              accountType,
              ...addressPayload,
              professionalType,
              gender,
              age,
              hourlyRate,
              transferNeed,
              bio
            }
          : {
              name,
              email,
              password,
              accountType,
              ...addressPayload,
              approximateWeightKg,
              preferredGender,
              transferNeed,
              mobilityNotes
            };

      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? registerPayload : { email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Nao foi possivel continuar.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  function renderSocialButtons(variant: "compact" | "icon") {
    const socialButtonClass =
      variant === "compact"
        ? "grid h-12 w-12 place-items-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-800 transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
        : "grid h-11 w-11 place-items-center rounded-lg border border-slate-300 bg-white text-lg font-bold text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-100";
    const disabledClass =
      variant === "compact"
        ? "grid h-12 w-12 cursor-not-allowed place-items-center rounded-full border border-slate-200 bg-slate-50 text-lg font-bold text-slate-300"
        : "grid h-11 w-11 cursor-not-allowed place-items-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold text-slate-300";

    return (
      <div className="flex items-center justify-center gap-3">
        {providers.google ? (
          <a
            href={oauthHref("google")}
            aria-label={mode === "login" ? "Entrar com Google" : "Cadastrar com Google"}
            title={mode === "login" ? "Entrar com Google" : "Cadastrar com Google"}
            className={socialButtonClass}
          >
            <span aria-hidden="true" className="font-sans text-[20px] leading-none text-[#4285f4]">
              G
            </span>
          </a>
        ) : (
          <button type="button" disabled aria-label="Google ainda nao configurado" title="Google ainda nao configurado" className={disabledClass}>
            <span aria-hidden="true" className="font-sans text-[20px] leading-none">
              G
            </span>
          </button>
        )}

        {providers.apple ? (
          <a
            href={oauthHref("apple")}
            aria-label={mode === "login" ? "Entrar com Apple" : "Cadastrar com Apple"}
            title={mode === "login" ? "Entrar com Apple" : "Cadastrar com Apple"}
            className={`${socialButtonClass} ${variant === "compact" ? "border-slate-950 bg-slate-950 text-white hover:bg-slate-800" : "border-slate-950 bg-slate-950 text-white hover:bg-slate-800"}`}
          >
            <Apple aria-hidden="true" className="h-5 w-5" />
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Apple ainda nao configurado"
            title="Apple ainda nao configurado"
            className={`${disabledClass} text-slate-300`}
          >
            <Apple aria-hidden="true" className="h-5 w-5" />
          </button>
        )}
      </div>
    );
  }

  if (mode === "login") {
    return (
      <section className="surface mx-auto max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.12)] sm:p-7">
          <h1 className="text-4xl font-semibold tracking-normal text-slate-950">Entrar</h1>

          <div className="mt-6">{renderSocialButtons("compact")}</div>

          <p className="mt-5 text-sm leading-6 text-slate-600">
            Ao continuar, voce aceita os{" "}
            <Link href="/terms" className="font-semibold text-blue-700">
              Termos de Uso
            </Link>
            , a{" "}
            <Link href="/privacy" className="font-semibold text-blue-700">
              Politica de Privacidade
            </Link>{" "}
            e a{" "}
            <Link href="/cookies" className="font-semibold text-blue-700">
              Politica de Cookies
            </Link>{" "}
            do CuidarLink.
          </p>

          <div className="my-7 flex items-center gap-3 text-sm text-slate-500">
            <span className="h-px flex-1 bg-slate-200" />
            ou
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1 rounded-md border border-blue-600 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-blue-100">
              <span className="text-sm text-slate-700">E-mail</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seuemail@exemplo.com"
                className="h-7 border-0 bg-transparent text-lg text-slate-950 outline-none"
                autoComplete="email"
              />
            </label>

            <label className="grid gap-1 rounded-md border border-slate-400 bg-blue-50/70 px-3 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
              <span className="text-sm text-slate-700">Senha</span>
              <span className="flex items-center gap-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sua senha"
                  className="h-7 min-w-0 flex-1 border-0 bg-transparent text-slate-950 outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700"
                >
                  {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                  {showPassword ? "Ocultar" : "Exibir"}
                </button>
              </span>
            </label>

            {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

            <label className="flex items-center gap-3 text-base text-slate-800">
              <input
                type="checkbox"
                checked={keepConnected}
                onChange={(event) => setKeepConnected(event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 accent-blue-600"
              />
              Manter minha conexao ativa
            </label>

            <Button onClick={handleSubmit} disabled={isPending} className="mt-2 h-14 rounded-full bg-blue-700 text-base hover:bg-blue-800">
              {isPending ? "Processando..." : "Entrar"}
            </Button>
          </div>

          <p className="mt-7 text-center text-sm text-slate-600">
            Ainda nao faz parte do CuidarLink?{" "}
            <Link href="/register" className="font-semibold text-blue-700">
              Cadastre-se agora
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="surface mx-auto max-w-2xl">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-emerald-700">Cadastro CuidarLink</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Crie seu perfil de cuidado</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Pacientes e profissionais entram por fluxos diferentes, ja com dados para matching.
        </p>

        <div className="mt-6 grid gap-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAccountType("PATIENT")}
              className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${
                accountType === "PATIENT" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"
              }`}
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              Paciente
            </button>
            <button
              type="button"
              onClick={() => setAccountType("PROFESSIONAL")}
              className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${
                accountType === "PROFESSIONAL" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600"
              }`}
            >
              <BriefcaseMedical aria-hidden="true" className="h-4 w-4" />
              Profissional
            </button>
          </div>

          {renderSocialButtons("icon")}

          <div className="flex items-center gap-3 text-xs font-semibold uppercase text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            ou
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" className={fieldClass} />

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seuemail@exemplo.com"
            className={fieldClass}
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Sua senha"
            className={fieldClass}
          />

          <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            {passwordRules.map((rule) => (
              <div key={rule.id} className={`flex items-center gap-2 ${rule.valid ? "text-emerald-700" : "text-rose-700"}`}>
                <span
                  aria-hidden="true"
                  className={`grid h-5 w-5 place-items-center rounded-full text-xs font-bold ${
                    rule.valid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {rule.valid ? "✓" : "!"}
                </span>
                {rule.label}
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Telefone" className={fieldClass} />
          </div>

          <CepAddressFields
            value={{
              postalCode,
              addressLine,
              addressNumber,
              addressComplement,
              neighborhood,
              city,
              state: stateCode
            }}
            onChange={updateAddress}
          />

          {accountType === "PROFESSIONAL" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={professionalType} onChange={(event) => setProfessionalType(event.target.value)} className={fieldClass}>
                  <option value="CUIDADOR">Cuidador</option>
                  <option value="TECNICO_ENFERMAGEM">Tecnico de enfermagem</option>
                  <option value="FISIOTERAPEUTA">Fisioterapeuta</option>
                </select>
                <select value={gender} onChange={(event) => setGender(event.target.value)} className={fieldClass}>
                  <option value="FEMININO">Feminino</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="OUTRO">Outro</option>
                </select>
                <input value={age} onChange={(event) => setAge(event.target.value)} placeholder="Idade" className={fieldClass} />
                <input
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(event.target.value)}
                  placeholder="Valor por hora"
                  className={fieldClass}
                />
              </div>
              <select value={transferNeed} onChange={(event) => setTransferNeed(event.target.value)} className={fieldClass}>
                <option value="MODERADO">Apoio moderado</option>
                <option value="ALTO">Apoio fisico alto</option>
                <option value="DUPLA">Duas pessoas</option>
              </select>
              <textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Resumo da sua experiencia"
                className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={approximateWeightKg}
                  onChange={(event) => setApproximateWeightKg(event.target.value)}
                  placeholder="Peso aproximado"
                  className={fieldClass}
                />
                <select value={preferredGender} onChange={(event) => setPreferredGender(event.target.value)} className={fieldClass}>
                  <option value="FEMININO">Prefiro mulher</option>
                  <option value="MASCULINO">Prefiro homem</option>
                  <option value="QUALQUER">Qualquer genero</option>
                </select>
                <select value={transferNeed} onChange={(event) => setTransferNeed(event.target.value)} className={fieldClass}>
                  <option value="MODERADO">Apoio moderado</option>
                  <option value="ALTO">Apoio fisico alto</option>
                  <option value="DUPLA">Duas pessoas</option>
                </select>
              </div>
              <textarea
                value={mobilityNotes}
                onChange={(event) => setMobilityNotes(event.target.value)}
                placeholder="Observacoes de mobilidade, banho, transferencia ou equipamentos"
                className="min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </>
          )}

          {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

          <Button onClick={handleSubmit} disabled={isPending || !canSubmitRegister}>
            {isPending ? "Processando..." : "Criar conta"}
          </Button>
        </div>

        <div className="mt-6 text-sm text-slate-500">
          Ja possui conta?{" "}
          <Link href="/login" className="font-semibold text-slate-900">
            Fazer login
          </Link>
        </div>
      </div>
    </section>
  );
}
