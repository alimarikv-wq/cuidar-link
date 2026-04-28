export function cleanCpf(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatCpf(value: string) {
  const digits = cleanCpf(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function maskCpf(value: string | null | undefined) {
  const digits = cleanCpf(value || "");
  if (digits.length !== 11) return "";
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function isValidCpf(value: string) {
  const cpf = cleanCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}
