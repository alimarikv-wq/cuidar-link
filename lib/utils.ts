import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatMiles(value: number) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

export function formatProgram(program: string) {
  const map: Record<string, string> = {
    LATAM_PASS: "Latam Pass",
    SMILES: "Smiles",
    AZUL_FIDELIDADE: "Azul Fidelidade",
    TAP_MILES_GO: "TAP Miles&Go",
    LIVELO: "Livelo",
    ESFERA: "Esfera",
    C6_ATOMOS: "C6 Atomos"
  };

  return map[program] || program;
}

export function formatDateShort(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value));
}

export function getDateWindow(targetDate: string, flexible: boolean) {
  const base = new Date(targetDate);
  const offsetDays = flexible ? 3 : 0;
  const start = new Date(base);
  const end = new Date(base);
  start.setDate(base.getDate() - offsetDays);
  start.setHours(0, 0, 0, 0);
  end.setDate(base.getDate() + offsetDays);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
