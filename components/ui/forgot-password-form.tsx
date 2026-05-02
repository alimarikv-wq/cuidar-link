"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError("");
    setSuccess("");

    startTransition(async () => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nao foi possivel enviar o e-mail agora.");
        return;
      }

      setSuccess(data.message || "Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha.");
    });
  }

  return (
    <section className="surface mx-auto max-w-md">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_36px_rgba(15,23,42,0.12)] sm:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Mail aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-normal text-slate-950">Esqueci minha senha</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Informe o e-mail usado no CuidarLink. Se a conta existir, enviaremos um link para criar uma nova senha.
        </p>

        <div className="mt-6 grid gap-4">
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

          {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {success ? <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p> : null}

          <Button onClick={handleSubmit} disabled={isPending || !email} className="h-12 rounded-full bg-blue-700 text-base hover:bg-blue-800">
            {isPending ? "Enviando..." : "Enviar link de recuperacao"}
          </Button>
        </div>

        <p className="mt-7 text-center text-sm text-slate-600">
          Lembrou a senha?{" "}
          <Link href="/login" className="font-semibold text-blue-700">
            Voltar para entrar
          </Link>
        </p>
      </div>
    </section>
  );
}
