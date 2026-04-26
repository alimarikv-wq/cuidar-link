import bcrypt from "bcryptjs";
import {
  AccountType,
  CareRequestStatus,
  CareService,
  DocumentType,
  Gender,
  GenderPreference,
  PrismaClient,
  ProfessionalType,
  SubscriptionTier,
  TransferSupportLevel,
  UserRole,
  VerificationStatus
} from "@prisma/client";

const prisma = new PrismaClient();

const zoneSulBase = {
  city: "Porto Alegre",
  latitude: -30.111947,
  longitude: -51.256708
};

async function main() {
  await prisma.careRequest.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.professionalDocument.deleteMany();
  await prisma.professionalProfile.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.oAuthAccount.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.awardOffer.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash("admin123", 10);
  const demoHash = await bcrypt.hash("demo123", 10);

  await prisma.user.create({
    data: {
      name: "Admin CuidarLink",
      email: "admin@cuidarlink.com",
      passwordHash: adminHash,
      role: UserRole.ADMIN,
      accountType: AccountType.PATIENT,
      subscriptionTier: SubscriptionTier.PREMIUM
    }
  });

  const patient = await prisma.user.create({
    data: {
      name: "Joao Paciente",
      email: "paciente@cuidarlink.com",
      passwordHash: demoHash,
      accountType: AccountType.PATIENT,
      patientProfile: {
        create: {
          phone: "(51) 99999-0101",
          city: zoneSulBase.city,
          neighborhood: "Tristeza",
          addressLine: "Zona Sul, Porto Alegre",
          latitude: zoneSulBase.latitude,
          longitude: zoneSulBase.longitude,
          approximateWeightKg: 118,
          preferredGender: GenderPreference.FEMININO,
          transferNeed: TransferSupportLevel.ALTO,
          mobilityNotes: "PCD adulto, precisa de banho assistido e transferencia segura cadeira-cama."
        }
      }
    },
    include: { patientProfile: true }
  });

  const professionals = [
    {
      name: "Ana Martins",
      email: "ana.martins@cuidarlink.com",
      professionalType: ProfessionalType.TECNICO_ENFERMAGEM,
      gender: Gender.FEMININO,
      age: 34,
      phone: "(51) 99910-1010",
      neighborhood: "Tristeza",
      latitude: -30.106211,
      longitude: -51.250588,
      hourlyRate: 58,
      photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=420&q=80",
      bio: "Atua em cuidado domiciliar para PCD, pos-operatorio e rotina de higiene com privacidade.",
      mobilitySupport: "Transferencia cadeira-cama, banho assistido e uso de guincho simples.",
      supportLevel: TransferSupportLevel.ALTO,
      services: [CareService.BANHO, CareService.TRANSFERENCIA, CareService.MEDICACAO, CareService.CURATIVOS],
      rating: 4.96,
      reviewCount: 128,
      responseMinutes: 8,
      documents: [
        ["COREN ativo", DocumentType.COREN, VerificationStatus.VERIFICADO, "COREN-RS 123456"],
        ["BLS", DocumentType.CERTIFICADO, VerificationStatus.VERIFICADO, null],
        ["Experiencia bariatrica", DocumentType.REFERENCIA, VerificationStatus.VERIFICADO, null]
      ],
      availability: [
        [1, "08:00", "18:00"],
        [2, "08:00", "18:00"],
        [3, "08:00", "18:00"],
        [6, "09:00", "15:00"]
      ]
    },
    {
      name: "Marina Soares",
      email: "marina.soares@cuidarlink.com",
      professionalType: ProfessionalType.CUIDADOR,
      gender: Gender.FEMININO,
      age: 41,
      phone: "(51) 99920-2020",
      neighborhood: "Cavalhada",
      latitude: -30.109725,
      longitude: -51.225471,
      hourlyRate: 46,
      photoUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=420&q=80",
      bio: "Especializada em plantao curto para banho, higiene e apoio de rotina em Porto Alegre.",
      mobilitySupport: "Apoio fisico forte, banho no leito, troca e organizacao do ambiente.",
      supportLevel: TransferSupportLevel.ALTO,
      services: [CareService.BANHO, CareService.TRANSFERENCIA, CareService.COMPANHIA, CareService.REFEICAO],
      rating: 4.88,
      reviewCount: 94,
      responseMinutes: 5,
      documents: [
        ["Curso de cuidador", DocumentType.CERTIFICADO, VerificationStatus.VERIFICADO, null],
        ["Referencias verificadas", DocumentType.REFERENCIA, VerificationStatus.VERIFICADO, null],
        ["Treino de transferencia", DocumentType.CERTIFICADO, VerificationStatus.VERIFICADO, null]
      ],
      availability: [
        [0, "07:00", "22:00"],
        [1, "07:00", "22:00"],
        [2, "07:00", "22:00"],
        [3, "07:00", "22:00"],
        [4, "07:00", "22:00"],
        [5, "07:00", "22:00"],
        [6, "07:00", "22:00"]
      ]
    },
    {
      name: "Bruno Almeida",
      email: "bruno.almeida@cuidarlink.com",
      professionalType: ProfessionalType.FISIOTERAPEUTA,
      gender: Gender.MASCULINO,
      age: 29,
      phone: "(51) 99930-3030",
      neighborhood: "Menino Deus",
      latitude: -30.055902,
      longitude: -51.223197,
      hourlyRate: 95,
      sessionRate: 120,
      photoUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=420&q=80",
      bio: "Foco em seguranca de transferencia, condicionamento e autonomia para atividades diarias.",
      mobilitySupport: "Mobilidade funcional, transferencia com segunda pessoa e treino de marcha.",
      supportLevel: TransferSupportLevel.DUPLA,
      services: [CareService.FISIOTERAPIA, CareService.TRANSFERENCIA, CareService.AVALIACAO, CareService.FORTALECIMENTO],
      rating: 4.91,
      reviewCount: 76,
      responseMinutes: 12,
      documents: [
        ["CREFITO ativo", DocumentType.CREFITO, VerificationStatus.VERIFICADO, "CREFITO-5 654321"],
        ["Neurofuncional", DocumentType.CERTIFICADO, VerificationStatus.VERIFICADO, null],
        ["Atendimento PCD adulto", DocumentType.REFERENCIA, VerificationStatus.VERIFICADO, null]
      ],
      availability: [
        [1, "16:00", "21:00"],
        [3, "16:00", "21:00"],
        [5, "16:00", "21:00"]
      ]
    },
    {
      name: "Patricia Costa",
      email: "patricia.costa@cuidarlink.com",
      professionalType: ProfessionalType.TECNICO_ENFERMAGEM,
      gender: Gender.FEMININO,
      age: 52,
      phone: "(51) 99940-4040",
      neighborhood: "Ipanema",
      latitude: -30.128849,
      longitude: -51.239726,
      hourlyRate: 62,
      photoUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=420&q=80",
      bio: "Perfil calmo para rotinas recorrentes, controle de medicacao e acompanhamento familiar.",
      mobilitySupport: "Higiene, medicacao, sinais vitais e apoio moderado em transferencias.",
      supportLevel: TransferSupportLevel.MODERADO,
      services: [CareService.BANHO, CareService.MEDICACAO, CareService.CURATIVOS, CareService.SINAIS_VITAIS],
      rating: 4.84,
      reviewCount: 142,
      responseMinutes: 18,
      documents: [
        ["COREN ativo", DocumentType.COREN, VerificationStatus.VERIFICADO, "COREN-RS 778899"],
        ["Feridas e curativos", DocumentType.CERTIFICADO, VerificationStatus.VERIFICADO, null],
        ["Cuidados de longa permanencia", DocumentType.REFERENCIA, VerificationStatus.VERIFICADO, null]
      ],
      availability: [
        [2, "08:00", "14:00"],
        [4, "08:00", "14:00"],
        [6, "08:00", "14:00"]
      ]
    },
    {
      name: "Camila Rocha",
      email: "camila.rocha@cuidarlink.com",
      professionalType: ProfessionalType.CUIDADOR,
      gender: Gender.FEMININO,
      age: 27,
      phone: "(51) 99950-5050",
      neighborhood: "Cristal",
      latitude: -30.084164,
      longitude: -51.246465,
      hourlyRate: 42,
      photoUrl: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=420&q=80",
      bio: "Atendimento direto e organizado para demandas pontuais ou recorrentes na zona sul.",
      mobilitySupport: "Banho assistido, preparo de rotina e apoio fisico para paciente pesado.",
      supportLevel: TransferSupportLevel.ALTO,
      services: [CareService.BANHO, CareService.COMPANHIA, CareService.REFEICAO, CareService.TRANSFERENCIA],
      rating: 4.79,
      reviewCount: 63,
      responseMinutes: 10,
      documents: [
        ["Curso de cuidador", DocumentType.CERTIFICADO, VerificationStatus.VERIFICADO, null],
        ["Treino PCD", DocumentType.CERTIFICADO, VerificationStatus.VERIFICADO, null],
        ["Plantao noturno", DocumentType.REFERENCIA, VerificationStatus.VERIFICADO, null]
      ],
      availability: [
        [1, "18:00", "23:00"],
        [2, "18:00", "23:00"],
        [3, "18:00", "23:00"],
        [6, "08:00", "22:00"]
      ]
    },
    {
      name: "Renata Nunes",
      email: "renata.nunes@cuidarlink.com",
      professionalType: ProfessionalType.FISIOTERAPEUTA,
      gender: Gender.FEMININO,
      age: 38,
      phone: "(51) 99960-6060",
      neighborhood: "Azenha",
      latitude: -30.050192,
      longitude: -51.210693,
      hourlyRate: 110,
      sessionRate: 140,
      photoUrl: "https://images.unsplash.com/photo-1612531385446-f7e6d131e1d0?auto=format&fit=crop&w=420&q=80",
      bio: "Avalia a casa, adapta o plano de exercicios e orienta familiares para reduzir risco.",
      mobilitySupport: "Plano de mobilidade, transferencia segura e orientacao para cuidador fixo.",
      supportLevel: TransferSupportLevel.DUPLA,
      services: [CareService.FISIOTERAPIA, CareService.AVALIACAO, CareService.FORTALECIMENTO, CareService.TRANSFERENCIA],
      rating: 4.93,
      reviewCount: 101,
      responseMinutes: 14,
      documents: [
        ["CREFITO ativo", DocumentType.CREFITO, VerificationStatus.VERIFICADO, "CREFITO-5 998877"],
        ["Respiratoria", DocumentType.CERTIFICADO, VerificationStatus.VERIFICADO, null],
        ["Neurofuncional", DocumentType.CERTIFICADO, VerificationStatus.VERIFICADO, null]
      ],
      availability: [
        [2, "09:00", "17:00"],
        [4, "09:00", "17:00"],
        [6, "09:00", "13:00"]
      ]
    }
  ] as const;

  const createdProfessionals = [];

  for (const professional of professionals) {
    const created = await prisma.professionalProfile.create({
      data: {
        user: {
          create: {
            name: professional.name,
            email: professional.email,
            passwordHash: demoHash,
            accountType: AccountType.PROFESSIONAL
          }
        },
        professionalType: professional.professionalType,
        gender: professional.gender,
        age: professional.age,
        phone: professional.phone,
        city: zoneSulBase.city,
        neighborhood: professional.neighborhood,
        latitude: professional.latitude,
        longitude: professional.longitude,
        serviceRadiusKm: 10,
        hourlyRate: professional.hourlyRate,
        sessionRate: "sessionRate" in professional ? professional.sessionRate : null,
        photoUrl: professional.photoUrl,
        bio: professional.bio,
        mobilitySupport: professional.mobilitySupport,
        supportLevel: professional.supportLevel,
        services: [...professional.services],
        rating: professional.rating,
        reviewCount: professional.reviewCount,
        responseMinutes: professional.responseMinutes,
        isVerified: true,
        documents: {
          create: professional.documents.map(([label, type, status, documentNumber]) => ({
            label,
            type,
            status,
            documentNumber
          }))
        },
        availability: {
          create: professional.availability.map(([weekday, startTime, endTime]) => ({
            weekday,
            startTime,
            endTime
          }))
        }
      }
    });

    createdProfessionals.push(created);
  }

  const ana = createdProfessionals[0];
  if (patient.patientProfile && ana) {
    await prisma.careRequest.create({
      data: {
        patientProfileId: patient.patientProfile.id,
        professionalId: ana.id,
        requesterName: patient.name,
        requesterEmail: patient.email,
        requesterPhone: "(51) 99999-0101",
        service: CareService.BANHO,
        supportNeed: TransferSupportLevel.ALTO,
        preferredGender: GenderPreference.FEMININO,
        scheduledFor: new Date("2026-04-25T17:30:00.000Z"),
        durationHours: 2,
        addressLine: "Zona Sul, Porto Alegre",
        neighborhood: "Tristeza",
        city: zoneSulBase.city,
        latitude: zoneSulBase.latitude,
        longitude: zoneSulBase.longitude,
        notes: "Banho assistido hoje. Paciente pesado, precisa de transferencia segura.",
        status: CareRequestStatus.ENVIADO
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
