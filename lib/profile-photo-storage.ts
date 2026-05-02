import { createClient } from "@supabase/supabase-js";

const bucketName = process.env.SUPABASE_PROFILE_PHOTOS_BUCKET || "profile-photos";
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxPhotoSizeBytes = 3 * 1024 * 1024;

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

function getPhotoFileExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function ensurePublicBucket(client: NonNullable<ReturnType<typeof getSupabaseStorageClient>>) {
  const { data } = await client.storage.getBucket(bucketName);
  if (data) return null;

  const { error } = await client.storage.createBucket(bucketName, {
    public: true
  });

  return error;
}

export function validateProfilePhoto(file: File) {
  if (!allowedMimeTypes.has(file.type)) {
    return "Envie uma foto JPG, JPEG, PNG ou WEBP.";
  }

  if (file.size > maxPhotoSizeBytes) {
    return "Envie uma foto de ate 3 MB.";
  }

  return null;
}

export async function uploadPublicProfilePhoto(input: { userId: string; file: File }) {
  const client = getSupabaseStorageClient();
  if (!client) {
    return { ok: false as const, error: "Storage de fotos ainda nao esta configurado." };
  }

  const fileError = validateProfilePhoto(input.file);
  if (fileError) {
    return { ok: false as const, error: fileError };
  }

  const bucketError = await ensurePublicBucket(client);
  if (bucketError) {
    return { ok: false as const, error: "Nao foi possivel preparar o bucket publico de fotos." };
  }

  const extension = getPhotoFileExtension(input.file);
  const path = `${input.userId}/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());

  const { error } = await client.storage.from(bucketName).upload(path, buffer, {
    contentType: input.file.type,
    upsert: false
  });

  if (error) {
    return { ok: false as const, error: "Nao foi possivel guardar a foto no storage." };
  }

  const { data } = client.storage.from(bucketName).getPublicUrl(path);

  return { ok: true as const, publicUrl: data.publicUrl };
}
