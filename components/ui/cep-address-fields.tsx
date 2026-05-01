"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";

export type CepAddressValue = {
  postalCode: string;
  addressLine: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type CepLookupResponse = Partial<CepAddressValue> & {
  error?: string;
};

type CepAddressFieldsProps = {
  value: CepAddressValue;
  onChange: (value: CepAddressValue) => void;
  className?: string;
  requiredFields?: Partial<Record<keyof CepAddressValue, boolean>>;
  invalidFields?: Partial<Record<keyof CepAddressValue, boolean>>;
};

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border bg-white px-3 text-sm text-slate-950 outline-none transition";

function requiredMark(required?: boolean) {
  return required ? <span className="text-rose-600" aria-label="obrigatorio">*</span> : null;
}

function inputClass(invalid?: boolean) {
  return invalid
    ? `${fieldClass} border-rose-400 bg-rose-50/40 focus:border-rose-600 focus:ring-2 focus:ring-rose-100`
    : `${fieldClass} border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function formatCep(value: string) {
  const digits = onlyDigits(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function CepAddressFields({ value, onChange, className = "", requiredFields = {}, invalidFields = {} }: CepAddressFieldsProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState("");
  const cepDigits = onlyDigits(value.postalCode);

  function update(field: keyof CepAddressValue, nextValue: string) {
    onChange({
      ...value,
      [field]: field === "postalCode" ? formatCep(nextValue) : nextValue
    });
  }

  async function searchCep() {
    setMessage("");

    if (cepDigits.length !== 8) {
      setMessage("Digite um CEP com 8 numeros.");
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/cep/${cepDigits}`);
      const data = (await response.json()) as CepLookupResponse;

      if (!response.ok) {
        setMessage(data.error || "Nao foi possivel buscar o CEP.");
        return;
      }

      onChange({
        ...value,
        postalCode: data.postalCode ? formatCep(data.postalCode) : value.postalCode,
        addressLine: data.addressLine || value.addressLine,
        addressComplement: value.addressComplement || data.addressComplement || "",
        neighborhood: data.neighborhood || value.neighborhood,
        city: data.city || value.city,
        state: data.state || value.state
      });
      setMessage("Endereco encontrado. Confira numero e complemento.");
    } catch {
      setMessage("Nao foi possivel buscar o CEP agora.");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className={`grid min-w-0 gap-3 ${className}`}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-700">
          <span>CEP {requiredMark(requiredFields.postalCode)}</span>
          <input
            value={value.postalCode}
            onChange={(event) => update("postalCode", event.target.value)}
            placeholder="00000-000"
            inputMode="numeric"
            aria-invalid={invalidFields.postalCode ? "true" : undefined}
            className={inputClass(invalidFields.postalCode)}
          />
        </label>
        <button
          type="button"
          onClick={searchCep}
          disabled={isSearching || cepDigits.length !== 8}
          className="mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 sm:w-auto"
        >
          {isSearching ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Search aria-hidden="true" className="h-4 w-4" />}
          Buscar CEP
        </button>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-700">
          <span>Endereco {requiredMark(requiredFields.addressLine)}</span>
          <input
            value={value.addressLine}
            onChange={(event) => update("addressLine", event.target.value)}
            placeholder="Rua, avenida ou referencia"
            aria-invalid={invalidFields.addressLine ? "true" : undefined}
            className={inputClass(invalidFields.addressLine)}
          />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-700">
          <span>Numero {requiredMark(requiredFields.addressNumber)}</span>
          <input
            value={value.addressNumber}
            onChange={(event) => update("addressNumber", event.target.value)}
            placeholder="123"
            aria-invalid={invalidFields.addressNumber ? "true" : undefined}
            className={inputClass(invalidFields.addressNumber)}
          />
        </label>
      </div>

      <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-700">
        <span>Complemento {requiredMark(requiredFields.addressComplement)}</span>
        <input
          value={value.addressComplement}
          onChange={(event) => update("addressComplement", event.target.value)}
          placeholder="Apto, bloco, andar ou ponto de referencia"
          aria-invalid={invalidFields.addressComplement ? "true" : undefined}
          className={inputClass(invalidFields.addressComplement)}
        />
      </label>

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_80px]">
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-700">
          <span>Bairro {requiredMark(requiredFields.neighborhood)}</span>
          <input
            value={value.neighborhood}
            onChange={(event) => update("neighborhood", event.target.value)}
            placeholder="Bairro"
            aria-invalid={invalidFields.neighborhood ? "true" : undefined}
            className={inputClass(invalidFields.neighborhood)}
          />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-700">
          <span>Cidade {requiredMark(requiredFields.city)}</span>
          <input
            value={value.city}
            onChange={(event) => update("city", event.target.value)}
            placeholder="Cidade"
            aria-invalid={invalidFields.city ? "true" : undefined}
            className={inputClass(invalidFields.city)}
          />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-semibold text-slate-700">
          <span>UF {requiredMark(requiredFields.state)}</span>
          <input
            value={value.state}
            onChange={(event) => update("state", event.target.value.toUpperCase().slice(0, 2))}
            placeholder="RS"
            aria-invalid={invalidFields.state ? "true" : undefined}
            className={inputClass(invalidFields.state)}
          />
        </label>
      </div>

      {message ? (
        <p className={`rounded-lg px-3 py-2 text-sm ${message.startsWith("Endereco") ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
