import { CareService, GenderPreference, ProfessionalType, TransferSupportLevel } from "@prisma/client";
import { CareProfessional } from "@/types";

type DemoSearchParams = {
  service: CareService;
  professionalType?: ProfessionalType;
  genderPreference: GenderPreference;
  supportNeed: TransferSupportLevel;
  radiusKm: number;
};

const supportWeight: Record<TransferSupportLevel, number> = {
  MODERADO: 1,
  ALTO: 2,
  DUPLA: 3
};

const demoProfessionals: CareProfessional[] = [
  {
    id: "demo-ana",
    name: "Ana Martins",
    professionalType: "TECNICO_ENFERMAGEM",
    roleLabel: "Tecnico de enfermagem",
    gender: "FEMININO",
    genderLabel: "Feminino",
    age: 34,
    city: "Porto Alegre",
    neighborhood: "Tristeza",
    distanceKm: 2.4,
    photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=420&q=80",
    rating: 4.96,
    reviewCount: 128,
    priceLabel: "R$ 58,00/h",
    availableIn: "Hoje",
    responseTimeLabel: "8 min",
    supportLevel: "ALTO",
    supportLevelLabel: "Apoio fisico alto",
    mobilitySupport: "Transferencia cadeira-cama, banho assistido e uso de guincho simples.",
    services: ["BANHO", "TRANSFERENCIA", "MEDICACAO", "CURATIVOS"],
    serviceLabels: ["Banho", "Transferencia", "Medicacao", "Curativos"],
    credentials: ["COREN ativo", "BLS", "Experiencia bariatrica"],
    bio: "Atua em cuidado domiciliar para PCD, pos-operatorio e rotina de higiene com privacidade.",
    isVerified: true,
    matchScore: 97
  },
  {
    id: "demo-marina",
    name: "Marina Soares",
    professionalType: "CUIDADOR",
    roleLabel: "Cuidador",
    gender: "FEMININO",
    genderLabel: "Feminino",
    age: 41,
    city: "Porto Alegre",
    neighborhood: "Cavalhada",
    distanceKm: 3.1,
    photoUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=420&q=80",
    rating: 4.88,
    reviewCount: 94,
    priceLabel: "R$ 46,00/h",
    availableIn: "Hoje",
    responseTimeLabel: "5 min",
    supportLevel: "ALTO",
    supportLevelLabel: "Apoio fisico alto",
    mobilitySupport: "Apoio fisico forte, banho no leito, troca e organizacao do ambiente.",
    services: ["BANHO", "TRANSFERENCIA", "COMPANHIA", "REFEICAO"],
    serviceLabels: ["Banho", "Transferencia", "Companhia", "Refeicao"],
    credentials: ["Curso de cuidador", "Referencias verificadas", "Treino de transferencia"],
    bio: "Especializada em plantao curto para banho, higiene e apoio de rotina em Porto Alegre.",
    isVerified: true,
    matchScore: 95
  },
  {
    id: "demo-bruno",
    name: "Bruno Almeida",
    professionalType: "FISIOTERAPEUTA",
    roleLabel: "Fisioterapeuta",
    gender: "MASCULINO",
    genderLabel: "Masculino",
    age: 29,
    city: "Porto Alegre",
    neighborhood: "Menino Deus",
    distanceKm: 6.7,
    photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=420&q=80",
    rating: 4.91,
    reviewCount: 76,
    priceLabel: "R$ 120,00/sessao",
    availableIn: "Hoje",
    responseTimeLabel: "12 min",
    supportLevel: "DUPLA",
    supportLevelLabel: "Duas pessoas",
    mobilitySupport: "Mobilidade funcional, transferencia com segunda pessoa e treino de marcha.",
    services: ["FISIOTERAPIA", "TRANSFERENCIA", "AVALIACAO", "FORTALECIMENTO"],
    serviceLabels: ["Fisioterapia", "Transferencia", "Avaliacao", "Fortalecimento"],
    credentials: ["CREFITO ativo", "Neurofuncional", "Atendimento PCD adulto"],
    bio: "Foco em seguranca de transferencia, condicionamento e autonomia para atividades diarias.",
    isVerified: true,
    matchScore: 90
  },
  {
    id: "demo-camila",
    name: "Camila Rocha",
    professionalType: "CUIDADOR",
    roleLabel: "Cuidador",
    gender: "FEMININO",
    genderLabel: "Feminino",
    age: 27,
    city: "Porto Alegre",
    neighborhood: "Cristal",
    distanceKm: 5.2,
    photoUrl: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=420&q=80",
    rating: 4.79,
    reviewCount: 63,
    priceLabel: "R$ 42,00/h",
    availableIn: "Hoje",
    responseTimeLabel: "10 min",
    supportLevel: "ALTO",
    supportLevelLabel: "Apoio fisico alto",
    mobilitySupport: "Banho assistido, preparo de rotina e apoio fisico para paciente pesado.",
    services: ["BANHO", "COMPANHIA", "REFEICAO", "TRANSFERENCIA"],
    serviceLabels: ["Banho", "Companhia", "Refeicao", "Transferencia"],
    credentials: ["Curso de cuidador", "Treino PCD", "Plantao noturno"],
    bio: "Atendimento direto e organizado para demandas pontuais ou recorrentes na zona sul.",
    isVerified: true,
    matchScore: 88
  }
];

export function shouldUseDemoFallback() {
  return process.env.CARE_ENABLE_DEMO_FALLBACK !== "false";
}

export function getDemoCareProfessionals(params: DemoSearchParams) {
  return demoProfessionals
    .filter((professional) => professional.services.includes(params.service))
    .filter((professional) => !params.professionalType || professional.professionalType === params.professionalType)
    .filter((professional) => params.genderPreference === "QUALQUER" || professional.gender === params.genderPreference)
    .filter((professional) => supportWeight[professional.supportLevel] >= supportWeight[params.supportNeed])
    .filter((professional) => professional.distanceKm <= params.radiusKm)
    .sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm);
}
