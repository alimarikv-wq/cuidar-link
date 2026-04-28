import { createClient } from "@supabase/supabase-js";

const bucketName = process.env.SUPABASE_DOCUMENTS_BUCKET || "professional-documents";
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxDocumentSizeBytes = 2 * 1024 * 1024;

function getSupabaseStorageClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function isDocumentStorageConfigured() {
  return Boolean(getSupabaseStorageClient());
}

export function validateDocumentFile(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    return "Envie PDF, JPG, JPEG ou PNG.";
  }

  if (file.size > maxDocumentSizeBytes) {
    return "Envie um arquivo de ate 2 MB.";
  }

  return null;
}

export function getDocumentFileExtension(file: File) {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  return "jpg";
}

async function ensurePrivateBucket(client: NonNullable<ReturnType<typeof getSupabaseStorageClient>>) {
  const { data } = await client.storage.getBucket(bucketName);
  if (data) return null;

  const { error } = await client.storage.createBucket(bucketName, {
    public: false
  });

  return error;
}

export async function uploadPrivateProfessionalDocument(input: {
  professionalId: string;
  documentType: string;
  file: File;
}) {
  const client = getSupabaseStorageClient();
  if (!client) {
    return { ok: false as const, error: "Storage privado ainda nao esta configurado." };
  }

  const fileError = validateDocumentFile(input.file);
  if (fileError) {
    return { ok: false as const, error: fileError };
  }

  const bucketError = await ensurePrivateBucket(client);
  if (bucketError) {
    return { ok: false as const, error: "Nao foi possivel preparar o bucket privado de documentos." };
  }

  const extension = getDocumentFileExtension(input.file);
  const path = `${input.professionalId}/${input.documentType.toLowerCase()}/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error } = await client.storage.from(bucketName).upload(path, buffer, {
    contentType: input.file.type,
    upsert: false
  });

  if (error) {
    return { ok: false as const, error: "Nao foi possivel guardar o documento no storage privado." };
  }

  return { ok: true as const, path };
}

export async function createPrivateDocumentSignedUrl(storagePath: string) {
  const client = getSupabaseStorageClient();
  if (!client) {
    return { ok: false as const, error: "Storage privado ainda nao esta configurado." };
  }

  const { data, error } = await client.storage.from(bucketName).createSignedUrl(storagePath, 60 * 5);
  if (error || !data?.signedUrl) {
    return { ok: false as const, error: "Nao foi possivel abrir o documento agora." };
  }

  return { ok: true as const, signedUrl: data.signedUrl };
}
