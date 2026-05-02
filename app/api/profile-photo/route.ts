import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { uploadPublicProfilePhoto, validateProfilePhoto } from "@/lib/profile-photo-storage";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Entre para enviar sua foto." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      patientProfile: true,
      professionalProfile: true
    }
  });

  if (!user) {
    return NextResponse.json({ error: "Sessao invalida." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Anexe uma foto JPG, JPEG, PNG ou WEBP." }, { status: 400 });
  }

  const fileError = validateProfilePhoto(file);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  const upload = await uploadPublicProfilePhoto({
    userId: user.id,
    file
  });

  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: 503 });
  }

  if (user.professionalProfile) {
    await prisma.professionalProfile.update({
      where: { id: user.professionalProfile.id },
      data: { photoUrl: upload.publicUrl }
    });
  } else if (user.patientProfile) {
    await prisma.patientProfile.update({
      where: { id: user.patientProfile.id },
      data: { photoUrl: upload.publicUrl }
    });
  } else {
    return NextResponse.json({ error: "Perfil de paciente ou profissional nao encontrado." }, { status: 403 });
  }

  return NextResponse.json({ success: true, photoUrl: upload.publicUrl });
}
