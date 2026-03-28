import { useEffect, useMemo, useState } from "react";
import supabase from "../../lib/supabaseClient";
import { GUIDE_MEDIA_BUCKET } from "../../lib/storageBuckets";

type Item = {
  name: string;
  path: string;
  url: string;
  isImage: boolean;
};

function isImageName(name: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

export default function GuideMediaUploader({ allianceCode }: { allianceCode: string }) {
  const code = String(allianceCode ?? "").trim().toUpperCase();
  const prefix = useMemo(() => `${code}/guides`, [code]);

  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!code) {
      setItems([]);
      return;
    }

    setLoading(true);
    setStatus("Loading guide media…");

    const res = await supabase.storage
      .from(GUIDE_MEDIA_BUCKET)
      .list(prefix, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

    if (res.error) {
      setStatus(res.error.message);
      setLoading(false);
      return;
    }

    const next: Item[] = [];
    for (const o of (res.data ?? [])) {
      const path = `${prefix}/${o.name}`;
      const signed = await supabase.storage.from(GUIDE_MEDIA_BUCKET).createSignedUrl(path, 60 * 60);
      if (!signed.error && signed.data?.signedUrl) {
        next.push({
          name: o.name,
          path,
          url: signed.data.signedUrl,
          isImage: isImageName(o.name),
        });
      }
    }

    setItems(next);
    setStatus(next.length ? "" : "No uploaded guide media yet.");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [prefix]);

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    if (!code) {
      alert("Missing alliance code.");
      return;
    }

    setStatus("Uploading…");

    for (const f of Array.from(files)) {
      const safe = f.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      const key = `${prefix}/${Date.now()}-${safe}`;

      const up = await supabase.storage.from(GUIDE_MEDIA_BUCKET).upload(key, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || undefined,
      });

      if (up.error) {
        setStatus(up.error.message);
        alert(up.error.message);
        return;
      }
    }

    setStatus("Uploaded ✅");
    await load();
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    alert("Signed URL copied ✅");
  }

  return (
    <div
      className="zombie-card"
      style={{
        padding: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 900 }}>Guide media</div>
      <div style={{ opacity: 0.78, fontSize: 12 }}>
        Bucket: <code>{GUIDE_MEDIA_BUCKET}</code> • Folder: <code>{prefix}</code>
      </div>

      <input type="file" multiple onChange={(e) => void upload(e.target.files)} />

      {status ? <div style={{ opacity: 0.82, fontSize: 12 }}>{status}</div> : null}
      {loading ? <div style={{ opacity: 0.75, fontSize: 12 }}>Refreshing media…</div> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item) => (
          <div
            key={item.path}
            style={{
              display: "grid",
              gap: 8,
              padding: 10,
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontWeight: 700, wordBreak: "break-word" }}>{item.name}</div>

            {item.isImage ? (
              <img
                src={item.url}
                alt={item.name}
                style={{
                  maxWidth: "100%",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            ) : (
              <a href={item.url} target="_blank" rel="noreferrer">
                Open file
              </a>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="zombie-btn" onClick={() => void copyUrl(item.url)}>
                Copy signed URL
              </button>
              <a className="zombie-btn" href={item.url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                Open
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}