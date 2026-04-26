import {
  AccountType,
  CareService,
  Gender,
  GenderPreference,
  Prisma,
  ProfessionalType,
  TransferSupportLevel
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type OnboardingInput = {
  name: string;
  email: string;
  passwordHash: string;
  accountType?: AccountType;
  phone?: string;
  neighborhood?: string;
  addressLine?: string;
  approximateWeightKg?: number;
  preferredGender?: GenderPreference;
  transferNeed?: TransferSupportLevel;
  mobilityNotes?: string;
  professionalType?: ProfessionalType;
  gender?: Gender;
  age?: number;
  hourlyRate?: number;
  bio?: string;
  mobilitySupport?: string;
};

const neighborhoodCoordinates: Record<string, { latitude: number; longitude: number }> = {
  Tristeza: { latitude: -30.106211, longitude: -51.250588 },
  Cavalhada: { latitude: -30.109725, longitude: -51.225471 },
  Cristal: { latitude: -30.084164, longitude: -51.246465 },
  Ipanema: { latitude: -30.128849, longitude: -51.239726 },
  "Menino Deus": { latitude: -30.055902, longitude: -51.223197 },
  Azenha: { latitude: -30.050192, longitude: -51.210693 }
};

function coordinatesFor(neighborhood?: string) {
  return neighborhood && neighborhoodCoordinates[neighborhood]
    ? neighborhoodCoordinates[neighborhood]
    : { latitude: -30.111947, longitude: -51.256708 };
}

function servicesForType(type: ProfessionalType) {
  if (type === ProfessionalType.FISIOTERAPEUTA) {
    return [CareService.FISIOTERAPIA, CareService.AVALIACAO, CareService.FORTALECIMENTO, CareService.TRANSFERENCIA];
  }

  if (type === ProfessionalType.TECNICO_ENFERMAGEM) {
    return [CareService.BANHO, CareService.TRANSFERENCIA, CareService.MEDICACAO, CareService.CURATIVOS, CareService.SINAIS_VITAIS];
  }

  return [CareService.BANHO, CareService.TRANSFERENCIA, CareService.COMPANHIA, CareService.REFEICAO];
}

export function buildUserCreateData(input: OnboardingInput): Prisma.UserCreateInput {
  const accountType = input.accountType || AccountType.PATIENT;
  const neighborhood = input.neighborhood || "Tristeza";
  const coordinates = coordinatesFor(neighborhood);
  const transferNeed = input.transferNeed || TransferSupportLevel.ALTO;

  if (accountType === AccountType.PROFESSIONAL) {
    const professionalType = input.professionalType || ProfessionalType.CUIDADOR;

    return {
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      accountType: AccountType.PROFESSIONAL,
      professionalProfile: {
        create: {
          professionalType,
          gender: input.gender || Gender.FEMININO,
          age: input.age || 30,
          phone: input.phone,
          city: "Porto Alegre",
          neighborhood,
          addressLine: input.addressLine,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          hourlyRate: input.hourlyRate || 50,
          bio: input.bio || "Profissional disponivel para cuidado domiciliar.",
          mobilitySupport: input.mobilitySupport || "Apoio em rotina domiciliar e transferencia conforme avaliacao.",
          supportLevel: transferNeed,
          services: servicesForType(professionalType)
        }
      }
    };
  }

  return {
    name: input.name,
    email: input.email,
    passwordHash: input.passwordHash,
    accountType: AccountType.PATIENT,
    patientProfile: {
      create: {
        phone: input.phone,
        city: "Porto Alegre",
        neighborhood,
        addressLine: input.addressLine,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        approximateWeightKg: input.approximateWeightKg,
        preferredGender: input.preferredGender || GenderPreference.FEMININO,
        transferNeed,
        mobilityNotes: input.mobilityNotes
      }
    }
  };
}

export async function createUserWithProfile(input: OnboardingInput) {
  return prisma.user.create({
    data: buildUserCreateData(input)
  });
}
