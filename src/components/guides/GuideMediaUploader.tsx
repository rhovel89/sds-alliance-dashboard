import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Item = { name: string; url: string; isImage: boolean };

function isImageName(name: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-()+ ]/g, "_").replace(/\s+/g, "_");
}

async function copy(text: string) {
  try { await navigator.clipboard.writeText(text); alert("Copied ✅"); }
  catch { alert("Copy failed"); }
}

export default function GuideMediaUploader({ allianceCode }: { allianceCode: string }) {
  const code = (allianceCode || "").trim();
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const prefix = useMemo(() => `${code}/guides`, [code]);

  async function refresh() {
    if (!code) return;
    setStatus("Loading…");
    const res = await supabase.storage.from("guide-media").list(prefix, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (res.error) { setStatus(res.error.message); return; }

    const out: Item[] = (res.data ?? []).map((o) => {
      const path = `${prefix}/${o.name}`;
      const { data } = supabase.storage.from("guide-media").getPublicUrl(path);
      return { name: o.name, url: data.publicUrl, isImage: isImageName(o.name) };
    });
    setItems(out);
    setStatus("");
  }

  async function uploadFiles(files: File[]) {
    if (!code) return alert("Missing alliance code");
    if (!files.length) return;

    setStatus("Uploading…");
    for (const f of files) {
      const safe = safeFileName(f.name || "upload");
      const key = `${prefix}/${Date.now()}-${safe}`;

      const up = await supabase.storage.from("guide-media").upload(key, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || undefined
      });

      if (up.error) {
        setStatus("Upload failed: " + up.error.message);
        return;
      }
    }
    setStatus("Uploaded ✅");
    await refresh();
    window.setTimeout(() => setStatus(""), 1000);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const fl = e.target.files;
    if (!fl) return;
    void uploadFiles(Array.from(fl));
    e.target.value = "";
  }

  // Drag & drop
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const fl = e.dataTransfer.files;
    if (!fl || fl.length === 0) return;
    void uploadFiles(Array.from(fl));
  }

  // Paste screenshots (clipboard images)
  function onPaste(e: ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const it of Array.from(items)) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) {
          // If pasted image has no name, give it one
          const named = new File([f], f.name && f.name !== "image.png" ? f.name : `pasted-${Date.now()}.png`, { type: f.type || "image/png" });
          files.push(named);
        }
      }
    }
    if (files.length) {
      void uploadFiles(files);
    }
  }

  useEffect(() => {
    void refresh();
    const el = dropRef.current;
    if (!el) return;

    const prevent = (e: DragEvent) => { e.preventDefault(); };
    el.addEventListener("dragover", prevent);
    el.addEventListener("drop", prevent);

    // Paste listener (works when the drop area is focused/clicked)
    document.addEventListener("paste", onPaste);

    return () => {
      el.removeEventListener("dragover", prevent);
      el.removeEventListener("drop", prevent);
      document.removeEventListener("paste", onPaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 900 }}>Media Uploads</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Upload from computer • drag & drop • paste screenshots (Ctrl/Cmd+V)
            {status ? " • " + status : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => inputRef.current?.click()}>Choose files</button>
          <button onClick={() => void refresh()}>Refresh</button>
          <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={onPick} />
        </div>
      </div>

      <div
        ref={dropRef}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        tabIndex={0}
        style={{
          padding: 12,
          outline: "none",
          minHeight: 90,
          background: "rgba(255,255,255,0.02)"
        }}
        title="Click here then paste (Ctrl/Cmd+V), or drag & drop files"
      >
        <div style={{ opacity: 0.75, marginBottom: 10 }}>
          Drop files here, or click this area and paste a screenshot (Ctrl/Cmd+V).
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((it) => (
            <div key={it.url} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{it.name}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {it.isImage ? (
                    <button onClick={() => copy(`![${it.name}](${it.url})`)}>Copy Image Markdown</button>
                  ) : null}
                  <button onClick={() => copy(`[${it.name}](${it.url})`)}>Copy Link</button>
                  <a href={it.url} target="_blank" rel="noreferrer">Open</a>
                </div>
              </div>
              {it.isImage ? (
                <div style={{ marginTop: 10 }}>
                  <img src={it.url} alt={it.name} style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #222" }} />
                </div>
              ) : null}
            </div>
          ))}
          {items.length === 0 ? <div style={{ opacity: 0.7 }}>No uploads yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
