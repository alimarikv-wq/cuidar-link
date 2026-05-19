import { CareService, GenderPreference, ProfessionalType, TransferSupportLevel } from "@prisma/client";
import { CareProfessional } from "@/types";

type DemoSearchParams = {
  service: CareService;
  professionalType?: ProfessionalType;
  genderPreference: GenderPreference;
  supportNeed: TransferSupportLevel;
  radiusKm: number;
  travelRequested?: boolean;
  fixedContractRequested?: boolean;
  ageMin?: number;
  ageMax?: number;
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
    roleLabel: "Técnico de enfermagem",
    gender: "FEMININO",
    genderLabel: "Feminino",
    age: 34,
    city: "Porto Alegre",
    neighborhood: "Tristeza",
    latitude: -30.106211,
    longitude: -51.250588,
    distanceKm: 2.4,
    photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=420&q=80",
    whatsappUrl: null,
    rating: 4.96,
    reviewCount: 128,
    priceLabel: "Sob consulta",
    availableIn: "Hoje",
    responseTimeLabel: "8 min",
    supportLevel: "ALTO",
    supportLevelLabel: "Porte físico forte",
    mobilitySupport: "Transferência cadeira-cama, banho assistido e uso de guincho simples.",
    acceptsTravel: true,
    acceptsFixedContract: true,
    hasPassport: true,
    hasUsVisa: false,
    travelNotes: "Aceita viagens nacionais e consultas fora da cidade com combinação prévia.",
    services: ["BANHO", "TRANSFERENCIA", "MEDICACAO", "CURATIVOS"],
    serviceLabels: ["Banho", "Transferência", "Medicação", "Curativos"],
    credentials: ["COREN ativo", "BLS", "Experiência bariátrica"],
    bio: "Atua em cuidado domiciliar para PCD, pos-operatorio e rotina de higiene com privacidade.",
    isVerified: true,
    matchScore: 97,
    recentReviews: []
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
    latitude: -30.109725,
    longitude: -51.225471,
    distanceKm: 3.1,
    photoUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=420&q=80",
    whatsappUrl: null,
    rating: 4.88,
    reviewCount: 94,
    priceLabel: "Sob consulta",
    availableIn: "Hoje",
    responseTimeLabel: "5 min",
    supportLevel: "ALTO",
    supportLevelLabel: "Porte físico forte",
    mobilitySupport: "Apoio físico forte, banho no leito, troca e organização do ambiente.",
    acceptsTravel: true,
    acceptsFixedContract: true,
    hasPassport: false,
    hasUsVisa: false,
    travelNotes: "Disponivel para viagens curtas no RS e acompanhamento em eventos.",
    services: ["BANHO", "TRANSFERENCIA", "COMPANHIA", "REFEICAO"],
    serviceLabels: ["Banho", "Transferência", "Companhia", "Refeição"],
    credentials: ["Curso de cuidador", "Referências verificadas", "Treino de transferência"],
    bio: "Especializada em plantão curto para banho, higiene e apoio de rotina em Porto Alegre.",
    isVerified: true,
    matchScore: 95,
    recentReviews: []
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
    latitude: -30.055902,
    longitude: -51.223197,
    distanceKm: 6.7,
    photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=420&q=80",
    whatsappUrl: null,
    rating: 4.91,
    reviewCount: 76,
    priceLabel: "Sob consulta",
    availableIn: "Hoje",
    responseTimeLabel: "12 min",
    supportLevel: "DUPLA",
    supportLevelLabel: "Duas pessoas",
    mobilitySupport: "Mobilidade funcional, transferencia com segunda pessoa e treino de marcha.",
    acceptsTravel: false,
    acceptsFixedContract: false,
    hasPassport: false,
    hasUsVisa: false,
    travelNotes: null,
    services: ["FISIOTERAPIA", "TRANSFERENCIA", "AVALIACAO", "FORTALECIMENTO"],
    serviceLabels: ["Fisioterapia", "Transferência", "Avaliação", "Fortalecimento"],
    credentials: ["CREFITO ativo", "Neurofuncional", "Atendimento PCD adulto"],
    bio: "Foco em segurança de transferência, condicionamento e autonomia para atividades diárias.",
    isVerified: true,
    matchScore: 90,
    recentReviews: []
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
    latitude: -30.084164,
    longitude: -51.246465,
    distanceKm: 5.2,
    photoUrl: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=420&q=80",
    whatsappUrl: null,
    rating: 4.79,
    reviewCount: 63,
    priceLabel: "Sob consulta",
    availableIn: "Hoje",
    responseTimeLabel: "10 min",
    supportLevel: "ALTO",
    supportLevelLabel: "Porte físico forte",
    mobilitySupport: "Banho assistido, preparo de rotina e apoio físico para paciente pesado.",
    acceptsTravel: false,
    acceptsFixedContract: true,
    hasPassport: false,
    hasUsVisa: false,
    travelNotes: null,
    services: ["BANHO", "COMPANHIA", "REFEICAO", "TRANSFERENCIA"],
    serviceLabels: ["Banho", "Companhia", "Refeição", "Transferência"],
    credentials: ["Curso de cuidador", "Treino PCD", "Plantão noturno"],
    bio: "Atendimento direto e organizado para demandas pontuais ou recorrentes na zona sul.",
    isVerified: true,
    matchScore: 88,
    recentReviews: []
  }
];

export function shouldUseDemoFallback() {
  return process.env.CARE_ENABLE_DEMO_FALLBACK !== "false";
}

export function getDemoCareProfessionals(params: DemoSearchParams) {
  return demoProfessionals
    .filter((professional) => params.service === "OUTRO" || professional.services.includes(params.service))
    .filter((professional) => !params.professionalType || professional.professionalType === params.professionalType)
    .filter((professional) => params.genderPreference === "QUALQUER" || professional.gender === params.genderPreference)
    .filter((professional) => !params.travelRequested || professional.acceptsTravel)
    .filter((professional) => !params.fixedContractRequested || professional.acceptsFixedContract)
    .filter((professional) => supportWeight[professional.supportLevel] >= supportWeight[params.supportNeed])
    .filter((professional) => !params.ageMin || professional.age >= params.ageMin)
    .filter((professional) => !params.ageMax || professional.age <= params.ageMax)
    .filter((professional) => professional.distanceKm <= params.radiusKm)
    .sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm);
}
