"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isStrongPassword, validatePassword } from "@/lib/password-policy";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const passwordRules = validatePassword(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = token && isStrongPassword(password) && passwordsMatch;

  function handleSubmit() {
    setError("");
    setSuccess("");

    startTransition(async () => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel redefinir a senha.");
        return;
      }

      setSuccess("Senha redefinida. Agora voce ja pode entrar com a nova senha.");
      setPassword("");
      setConfirmPassword("");
    });
  }

  return (
    <section className="surface mx-auto max-w-md">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.12)] sm:p-7">
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">Criar nova senha</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Escolha uma senha forte para voltar a acessar sua conta com seguranca.
        </p>

        <div className="mt-6 grid gap-4">
          {!token ? (
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Link invalido. Solicite um novo link de recuperacao.
            </p>
          ) : null}

          <label className="grid gap-1 rounded-md border border-slate-400 bg-blue-50/70 px-3 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
            <span className="text-sm text-slate-700">Nova senha</span>
            <span className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Sua nova senha"
                className="h-7 min-w-0 flex-1 border-0 bg-transparent text-slate-950 outline-none"
                autoComplete="new-password"
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

          <label className="grid gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
            <span className="text-sm text-slate-700">Confirmar senha</span>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repita a nova senha"
              className="h-7 border-0 bg-transparent text-slate-950 outline-none"
              autoComplete="new-password"
            />
          </label>

          <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm">
            {passwordRules.map((rule) => (
              <span key={rule.id} className={`inline-flex items-center gap-2 ${rule.valid ? "text-emerald-700" : "text-rose-700"}`}>
                {rule.valid ? <Check aria-hidden="true" className="h-4 w-4" /> : <X aria-hidden="true" className="h-4 w-4" />}
                {rule.label}
              </span>
            ))}
            <span className={`inline-flex items-center gap-2 ${passwordsMatch ? "text-emerald-700" : "text-rose-700"}`}>
              {passwordsMatch ? <Check aria-hidden="true" className="h-4 w-4" /> : <X aria-hidden="true" className="h-4 w-4" />}
              Senhas iguais
            </span>
          </div>

          {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {success ? <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}

          <Button onClick={handleSubmit} disabled={isPending || !canSubmit} className="h-12 rounded-full bg-blue-700 text-base hover:bg-blue-800">
            {isPending ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </div>

        <p className="mt-7 text-center text-sm text-slate-600">
          Voltar para{" "}
          <Link href="/login" className="font-semibold text-blue-700">
            entrar
          </Link>
        </p>
      </div>
    </section>
  );
}
