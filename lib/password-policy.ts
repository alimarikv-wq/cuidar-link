export const passwordPolicy = [
  {
    id: "length",
    label: "Pelo menos 8 caracteres",
    test: (password: string) => password.length >= 8
  },
  {
    id: "lowercase",
    label: "Uma letra minuscula",
    test: (password: string) => /[a-z]/.test(password)
  },
  {
    id: "uppercase",
    label: "Uma letra maiuscula",
    test: (password: string) => /[A-Z]/.test(password)
  },
  {
    id: "number",
    label: "Um numero",
    test: (password: string) => /\d/.test(password)
  },
  {
    id: "special",
    label: "Um caractere especial",
    test: (password: string) => /[^A-Za-z0-9]/.test(password)
  }
] as const;

export function validatePassword(password: string) {
  return passwordPolicy.map((rule) => ({
    id: rule.id,
    label: rule.label,
    valid: rule.test(password)
  }));
}

export function isStrongPassword(password: string) {
  return validatePassword(password).every((rule) => rule.valid);
}
