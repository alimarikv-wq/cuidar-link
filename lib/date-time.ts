export const BRAZIL_TIME_ZONE = "America/Sao_Paulo";

export function parseBrasiliaDateTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    return new Date(trimmed);
  }

  const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  return new Date(`${withSeconds}-03:00`);
}

export function formatBrasiliaDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BRAZIL_TIME_ZONE
  }).format(date);
}
