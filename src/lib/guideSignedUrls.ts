import { GUIDE_MEDIA_BUCKET, LEGACY_GUIDE_MEDIA_BUCKET } from "./storageBuckets";

export async function createGuideSignedUrl(supabase: any, path: string, expiresIn = 60 * 30) {
  const buckets = Array.from(
    new Set(
      [GUIDE_MEDIA_BUCKET, LEGACY_GUIDE_MEDIA_BUCKET]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
    )
  );

  let lastError: any = null;

  for (const bucket of buckets) {
    const signed = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (!signed.error && signed.data?.signedUrl) {
      return signed;
    }
    lastError = signed.error ?? lastError;
  }

  return {
    data: null,
    error: lastError ?? { message: "Could not create guide signed URL." },
  } as any;
}