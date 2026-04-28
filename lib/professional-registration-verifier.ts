import { DocumentType } from "@prisma/client";

export type ProfessionalRegistrationCheckInput = {
  council: Extract<DocumentType, "COREN" | "CREFITO">;
  registrationNumber: string;
  uf: string;
  cpf?: string;
};

export type ProfessionalRegistrationCheckResult = {
  status: "MANUAL_REVIEW" | "VALID" | "INVALID" | "UNAVAILABLE";
  source: "manual" | "coren-api" | "crefito-api";
  message: string;
};

export async function verifyProfessionalRegistration(
  input: ProfessionalRegistrationCheckInput
): Promise<ProfessionalRegistrationCheckResult> {
  const normalizedUf = input.uf.trim().toUpperCase();
  const normalizedRegistration = input.registrationNumber.trim();

  if (!normalizedRegistration || normalizedUf.length !== 2) {
    return {
      status: "MANUAL_REVIEW",
      source: "manual",
      message: "Registro profissional aguardando numero e UF para conferencia manual."
    };
  }

  // Integration point: replace this branch with an official COREN/CREFITO API adapter
  // when a reliable endpoint or automation is approved for production use.
  return {
    status: "MANUAL_REVIEW",
    source: "manual",
    message: `${input.council} ${normalizedRegistration}/${normalizedUf} preparado para conferencia manual e futura integracao.`
  };
}
