import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { GUIDE_MEDIA_BUCKET } from "../../lib/storageBuckets";

type Item = {
  name: string;
  path: string;
  url: string;
  isImage: boolean;
  createdAt?: string;
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
  const [busyPath, setBusyPath] = useState("");

  async function buildUrl(path: string) {
    const signed = await supabase.storage.from(GUIDE_MEDIA_BUCKET).createSignedUrl(path, 60 * 30);
    if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;

    const pub = supabase.storage.from(GUIDE_MEDIA_BUCKET).getPublicUrl(path);
    return String(pub?.data?.publicUrl ?? "");
  }

  async function load() {
    if (!code) {
      setItems([]);
      return;
    }

    setLoading(true);
    setStatus("Loading guide media…");

    const res = await supabase.storage
      .from(GUIDE_MEDIA_BUCKET)
      .list(prefix, {
        limit: 200,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (res.error) {
      setStatus(res.error.message);
      setLoading(false);
      return;
    }

    const rows = (res.data ?? []) as Array<Record<string, any>>;
    const next: Item[] = [];

    for (const o of rows) {
      const name = String(o?.name ?? "");
      if (!name) continue;

      const path = `${prefix}/${name}`;
      const url = await buildUrl(path);

      next.push({
        name,
        path,
        url,
        isImage: isImageName(name),
        createdAt: o?.created_at ? String(o.created_at) : undefined,
      });
    }

    setItems(next);
    setStatus(next.length ? "" : "No guide media uploaded yet.");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [code, prefix]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0 || !code) return;

    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      const safe = f.name.replace(/[^\w.\-]+/g, "_");
      const key = `${prefix}/${Date.now()}-${safe}`;

      setStatus(`Uploading ${i + 1}/${files.length}…`);

      const up = await supabase.storage.from(GUIDE_MEDIA_BUCKET).upload(key, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || undefined,
      });

      if (up.error) {
        setStatus(up.error.message);
        return;
      }
    }

    setStatus("Upload complete ✅");
    await load();
  }

  async function removeItem(item: Item) {
    const ok = window.confirm(`Delete "${item.name}"?`);
    if (!ok) return;

    setBusyPath(item.path);
    setStatus(`Deleting ${item.name}…`);

    const del = await supabase.storage.from(GUIDE_MEDIA_BUCKET).remove([item.path]);

    if (del.error) {
      setBusyPath("");
      setStatus(del.error.message);
      return;
    }

    setItems((prev) => prev.filter((x) => x.path !== item.path));
    setBusyPath("");
    setStatus("Deleted ✅");
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
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 900 }}>Guide media</div>
        <div style={{ opacity: 0.78, fontSize: 12 }}>
          Upload images/files for guides. You can also delete media directly here.
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          multiple
          onChange={(e) => void upload(e.target.files)}
        />
        <button
          type="button"
          className="zombie-btn"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: status ? 0.9 : 0.7 }}>
        {status || "Ready."}
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        }}
      >
        {items.map((item) => (
          <div
            key={item.path}
            style={{
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              overflow: "hidden",
              background: "rgba(0,0,0,0.16)",
              display: "grid",
            }}
          >
            <div
              style={{
                minHeight: 160,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              {item.isImage && item.url ? (
                <img
                  src={item.url}
                  alt={item.name}
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: 220,
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div style={{ padding: 16, textAlign: "center", opacity: 0.8 }}>
                  📎 File
                </div>
              )}
            </div>

            <div style={{ padding: 10, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, wordBreak: "break-word" }}>
                {item.name}
              </div>

              <div style={{ fontSize: 11, opacity: 0.7, wordBreak: "break-all" }}>
                {item.path}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="zombie-btn"
                  onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                  disabled={!item.url}
                >
                  Open
                </button>

                <button
                  type="button"
                  className="zombie-btn"
                  onClick={() => void removeItem(item)}
                  disabled={busyPath === item.path}
                >
                  {busyPath === item.path ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}