import supabase from "../../lib/supabaseClient";
import { GUIDE_MEDIA_BUCKET } from "../../lib/storageBuckets";

export function candidateGuideBuckets(): string[] {
  const values = [GUIDE_MEDIA_BUCKET, "guides", "guide-media", "alliance-guides"]
    .map((x) => String(x || "").trim())
    .filter(Boolean);

  return Array.from(new Set(values));
}

export function normalizeGuideObjectPath(input: string): string {
  let raw = String(input || "").trim();
  if (!raw) return "";

  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw);
      const marker = "/storage/v1/object/";
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        let rest = url.pathname.slice(idx + marker.length);
        rest = rest.replace(/^sign\//, "").replace(/^public\//, "").replace(/^render\/image\/[^/]+\//, "");
        const firstSlash = rest.indexOf("/");
        if (firstSlash >= 0) {
          raw = decodeURIComponent(rest.slice(firstSlash + 1));
        }
      }
    }
  } catch {
  }

  raw = raw.replace(/^\/+/, "").trim();

  for (const bucket of candidateGuideBuckets()) {
    if (raw.toLowerCase().startsWith((bucket + "/").toLowerCase())) {
      raw = raw.slice(bucket.length + 1);
      break;
    }
  }

  return raw;
}

export async function createGuideSignedUrlFlexible(
  input: string,
  expiresIn = 60 * 60
): Promise<{ data: { signedUrl: string } | null; error: any }> {
  const original = String(input || "").trim();
  if (!original) {
    return { data: null, error: new Error("Missing guide storage path.") };
  }

  if (/^https?:\/\//i.test(original) && !/\/storage\/v1\/object\//i.test(original)) {
    return { data: { signedUrl: original }, error: null };
  }

  const normalized = normalizeGuideObjectPath(original);
  const tries = new Set<string>();

  for (const bucket of candidateGuideBuckets()) {
    const a = normalized;
    if (a) tries.add(bucket + "::" + a);

    const prefixed = bucket + "/";
    if (original.toLowerCase().startsWith(prefixed.toLowerCase())) {
      tries.add(bucket + "::" + original.slice(prefixed.length));
    }
  }

  let lastError: any = null;

  for (const item of Array.from(tries)) {
    const parts = item.split("::");
    const bucket = parts[0];
    const path = parts.slice(1).join("::");

    if (!bucket || !path) continue;

    const signed = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (!signed.error && signed.data?.signedUrl) {
      return { data: { signedUrl: signed.data.signedUrl }, error: null };
    }

    lastError = signed.error;
  }

  if (/^https?:\/\//i.test(original)) {
    return { data: { signedUrl: original }, error: null };
  }

  return { data: null, error: lastError || new Error("Could not sign guide asset URL.") };
}