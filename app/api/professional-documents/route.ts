import { DocumentType, VerificationStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { createProfessionalDocumentForUser } from "@/lib/care-data";
import { cleanCpf, isValidCpf } from "@/lib/cpf";
import { uploadPrivateProfessionalDocument, validateDocumentFile } from "@/lib/document-storage";
import { prisma } from "@/lib/prisma";

function readText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isDocumentType(value: string): value is DocumentType {
  return Object.values(DocumentType).includes(value as DocumentType);
}

function equivalentDocumentTypes(type: DocumentType) {
  return type === DocumentType.RG || type === DocumentType.CNH ? [DocumentType.RG, DocumentType.CNH] : [type];
}

function isCouncilDocument(type: DocumentType) {
  return type === DocumentType.COREN || type === DocumentType.CREFITO;
}

function cleanRegistrationNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 12);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para enviar documentos." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { professionalProfile: true }
  });

  if (!user?.professionalProfile) {
    return NextResponse.json({ error: "Perfil profissional nao encontrado." }, { status: 403 });
  }

  const form = await request.formData();
  const type = readText(form, "type");
  const cpf = cleanCpf(readText(form, "cpf"));
  const documentNumber = readText(form, "documentNumber");
  const registrationNumber = cleanRegistrationNumber(documentNumber);
  const registrationUf = readText(form, "registrationUf").toUpperCase();
  const expiresAt = readText(form, "expiresAt");
  const consentAccepted = readText(form, "consentAccepted") === "true";
  const file = form.get("file");

  if (!isDocumentType(type)) {
    return NextResponse.json({ error: "Tipo de documento invalido." }, { status: 400 });
  }

  if (!isValidCpf(cpf)) {
    return NextResponse.json({ error: "Informe um CPF valido." }, { status: 400 });
  }

  const councilDocument = isCouncilDocument(type);
  if (councilDocument && (registrationNumber.length < 4 || registrationNumber.length > 12 || registrationUf.length !== 2)) {
    return NextResponse.json({ error: "Informe numero e UF do registro profissional." }, { status: 400 });
  }

  if (!consentAccepted) {
    return NextResponse.json({ error: "Autorize o uso dos dados para validacao cadastral." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Anexe um arquivo PDF, JPG, JPEG ou PNG." }, { status: 400 });
  }

  const fileError = validateDocumentFile(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  const existingDocument = await prisma.professionalDocument.findFirst({
    where: {
      professionalId: user.professionalProfile.id,
      type: { in: equivalentDocumentTypes(type) },
      status: { in: [VerificationStatus.PENDENTE, VerificationStatus.VERIFICADO] }
    }
  });

  if (existingDocument) {
    return NextResponse.json(
      { error: "Este documento ja foi enviado. Escolha o proximo documento obrigatorio ou aguarde a revisao." },
      { status: 409 }
    );
  }

  const upload = await uploadPrivateProfessionalDocument({
    professionalId: user.professionalProfile.id,
    documentType: type,
    file
  });

  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: 503 });
  }

  const result = await createProfessionalDocumentForUser(session.userId, {
    type,
    cpf,
    documentNumber: type === DocumentType.CPF ? cpf : councilDocument ? registrationNumber : undefined,
    registrationUf: councilDocument ? registrationUf : undefined,
    storagePath: upload.path,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    expiresAt: expiresAt || undefined,
    consentAccepted
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ success: true, document: result.document });
}
