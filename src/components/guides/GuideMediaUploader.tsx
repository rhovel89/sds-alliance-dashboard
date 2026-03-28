import { useEffect, useMemo, useState } from "react";
import supabase from "../../lib/supabaseClient";
import { GUIDE_MEDIA_BUCKET } from "../../lib/storageBuckets";
import { candidateGuideBuckets, createGuideSignedUrlFlexible } from "./guideStorage";

type Item = {
  bucket: string;
  path: string;
  name: string;
  url: string;
  isImage: boolean;
};

function safeName(v: string) {
  return String(v || "file")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isImageName(name: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(String(name || ""));
}

export default function GuideMediaUploader({ allianceCode }: { allianceCode: string }) {
  const code = useMemo(() => String(allianceCode || "").trim().toUpperCase(), [allianceCode]);
  const prefix = useMemo(() => (code ? `${code}/guides` : ""), [code]);

  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function copy(text: string, ok = "Copied ✅") {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(ok);
      window.setTimeout(() => setStatus(""), 2200);
    } catch {
      setStatus("Copy failed.");
      window.setTimeout(() => setStatus(""), 2200);
    }
  }

  async function refresh() {
    if (!prefix) {
      setItems([]);
      return;
    }

    setBusy(true);
    setStatus("Loading guide media…");

    try {
      const out: Item[] = [];
      const seen = new Set<string>();

      for (const bucket of candidateGuideBuckets()) {
        const res = await supabase.storage.from(bucket).list(prefix, {
          limit: 200,
          sortBy: { column: "created_at", order: "desc" },
        });

        if (res.error) continue;

        for (const o of res.data ?? []) {
          const name = String((o as any)?.name || "").trim();
          if (!name) continue;

          const path = `${prefix}/${name}`;
          const dedupe = `${bucket}::${path}`;
          if (seen.has(dedupe)) continue;
          seen.add(dedupe);

          const signed = await createGuideSignedUrlFlexible(`${bucket}/${path}`, 60 * 60);
          const url = signed.data?.signedUrl || "";

          out.push({
            bucket,
            path,
            name,
            url,
            isImage: isImageName(name),
          });
        }
      }

      setItems(out);
      setStatus(out.length ? "" : "No guide media found yet.");
    } catch (err: any) {
      setStatus(err?.message || "Could not load guide media.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [prefix]);

  async function upload(files: FileList | null) {
    if (!files || !files.length || !prefix) return;

    setBusy(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const name = `${Date.now()}-${safeName(f.name)}`;
        const key = `${prefix}/${name}`;

        setStatus(`Uploading ${i + 1}/${files.length}…`);

        const up = await supabase.storage.from(GUIDE_MEDIA_BUCKET).upload(key, f, {
          cacheControl: "3600",
          upsert: false,
          contentType: f.type || undefined,
        });

        if (up.error) {
          throw up.error;
        }
      }

      setStatus("Upload complete ✅");
      await refresh();
    } catch (err: any) {
      setStatus(err?.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="zombie-card"
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.03)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 900 }}>Guide media</div>
        <div style={{ opacity: 0.78, fontSize: 12 }}>
          Image previews now use signed URLs. For image blocks, use <b>Copy Path</b> first when you need a stable stored file reference.
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => void upload(e.target.files)}
          disabled={busy}
        />
        <button type="button" className="zombie-btn" onClick={() => void refresh()} disabled={busy}>
          Refresh
        </button>
      </div>

      {status ? (
        <div style={{ fontSize: 12, opacity: 0.85 }}>{status}</div>
      ) : null}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((it) => (
          <div
            key={`${it.bucket}:${it.path}`}
            style={{
              display: "grid",
              gap: 8,
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ fontWeight: 800, wordBreak: "break-word" }}>{it.name}</div>

            <div style={{ opacity: 0.72, fontSize: 12, wordBreak: "break-all" }}>
              {it.bucket}/{it.path}
            </div>

            {it.isImage && it.url ? (
              <img
                src={it.url}
                alt={it.name}
                style={{
                  width: "100%",
                  maxWidth: 420,
                  maxHeight: 260,
                  objectFit: "contain",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(0,0,0,0.12)",
                }}
              />
            ) : null}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="zombie-btn"
                onClick={() => void copy(it.path, "Path copied ✅")}
              >
                Copy Path
              </button>

              <button
                type="button"
                className="zombie-btn"
                onClick={() => void copy(it.url || `${it.bucket}/${it.path}`, "URL copied ✅")}
              >
                Copy URL
              </button>

              {it.url ? (
                <button
                  type="button"
                  className="zombie-btn"
                  onClick={() => window.open(it.url, "_blank", "noopener,noreferrer")}
                >
                  Open
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}