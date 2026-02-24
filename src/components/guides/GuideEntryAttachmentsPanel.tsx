import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Row = {
  id: string;
  entry_id: string;
  alliance_code: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  public_url: string;
  uploader_user_id: string;
  created_at: string;
};

function isImage(name: string) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-()+ ]/g, "_").replace(/\s+/g, "_");
}

function prettyBytes(n?: number | null) {
  if (!n || n <= 0) return "";
  const units = ["B","KB","MB","GB"];
  let v = n; let i = 0;
  while (v >= 1024 && i < units.length-1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function GuideEntryAttachmentsPanel(props: {
  allianceCode: string;
  sectionId?: string | null;
  entryId: string;
  canEdit: boolean;
}) {
  const allianceCode = (props.allianceCode || "").trim();
  const entryId = String(props.entryId || "");
  const sectionId = props.sectionId ? String(props.sectionId) : null;
  const canEdit = !!props.canEdit;

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const prefix = useMemo(() => `${allianceCode}/guides/entries/${entryId}`, [allianceCode, entryId]);

  async function load() {
    if (!allianceCode || !entryId) return;
    const res = await supabase
      .from("guide_entry_attachments")
      .select("*")
      .eq("alliance_code", allianceCode)
      .eq("entry_id", entryId)
      .order("created_at", { ascending: true });

    if (res.error) { setStatus(res.error.message); return; }
    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, [allianceCode, entryId]);

  async function uploadFiles(files: File[]) {
    if (!canEdit) return;
    if (!allianceCode || !entryId) return;
    if (!files.length) return;

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id ?? "";
    if (!uid) { alert("Please sign in."); return; }

    setStatus("Uploading…");

    for (const f of files) {
      const safe = safeFileName(f.name || "upload");
      const storagePath = `${prefix}/${Date.now()}-${safe}`;

      const up = await supabase.storage.from("guide-media").upload(storagePath, f, {
        upsert: false,
        cacheControl: "3600",
        contentType: f.type || undefined,
      });

      if (up.error) { setStatus("Upload failed: " + up.error.message); return; }

      const { data: urlData } = supabase.storage.from("guide-media").getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      const ins = await supabase.from("guide_entry_attachments").insert({
        alliance_code: allianceCode,
        section_id: sectionId,
        entry_id: entryId,
        uploader_user_id: uid,
        file_name: f.name || safe,
        mime_type: f.type || null,
        size_bytes: f.size ?? null,
        storage_path: storagePath,
        public_url: publicUrl,
      });

      if (ins.error) { setStatus("DB insert failed: " + ins.error.message); return; }
    }

    setStatus("Uploaded ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const fl = e.target.files;
    if (!fl) return;
    void uploadFiles(Array.from(fl));
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const fl = e.dataTransfer.files;
    if (!fl || fl.length === 0) return;
    void uploadFiles(Array.from(fl));
  }

  function onPaste(e: ClipboardEvent) {
    if (!canEdit) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const it of Array.from(items)) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) {
          const named = new File([f], f.name && f.name !== "image.png" ? f.name : `pasted-${Date.now()}.png`, { type: f.type || "image/png" });
          files.push(named);
        }
      }
    }
    if (files.length) void uploadFiles(files);
  }

  useEffect(() => {
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, allianceCode, entryId]);

  async function removeAttachment(r: Row) {
    const ok = confirm("Delete this attachment?");
    if (!ok) return;

    setStatus("Deleting…");

    // Remove DB row first (RLS enforced)
    const del = await supabase.from("guide_entry_attachments").delete().eq("id", r.id);
    if (del.error) { setStatus(del.error.message); return; }

    // Remove storage object (best-effort; RLS enforced)
    const rm = await supabase.storage.from("guide-media").remove([r.storage_path]);
    if (rm.error) {
      setStatus("Deleted row, but storage remove failed: " + rm.error.message);
      await load();
      return;
    }

    setStatus("Deleted ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  return (
    <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 800 }}>
          Attachments {rows.length ? `(${rows.length})` : ""}
          {status ? <span style={{ opacity: 0.75, fontWeight: 400 }}> • {status}</span> : null}
        </div>

        {canEdit ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => inputRef.current?.click()}>Attach</button>
            <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={onPick} />
            <button onClick={() => void load()}>Refresh</button>
          </div>
        ) : (
          <div style={{ opacity: 0.75, fontSize: 12 }}>View-only</div>
        )}
      </div>

      {canEdit ? (
        <div
          ref={dropRef}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          tabIndex={0}
          style={{
            marginTop: 10,
            padding: 10,
            border: "1px dashed rgba(255,255,255,0.18)",
            borderRadius: 10,
            opacity: 0.9
          }}
          title="Drop files here or click and paste (Ctrl/Cmd+V)"
        >
          Drop files here, or click this box then paste a screenshot (Ctrl/Cmd+V).
        </div>
      ) : null}

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 700 }}>
                {r.file_name} <span style={{ opacity: 0.7, fontSize: 12 }}>{prettyBytes(r.size_bytes)}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href={r.public_url} target="_blank" rel="noreferrer">Open</a>
                {canEdit ? <button onClick={() => void removeAttachment(r)}>Delete</button> : null}
              </div>
            </div>

            {isImage(r.file_name) ? (
              <div style={{ marginTop: 10 }}>
                <img src={r.public_url} alt={r.file_name} style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid rgba(255,255,255,0.10)" }} />
              </div>
            ) : null}
          </div>
        ))}
        {rows.length === 0 ? <div style={{ opacity: 0.7 }}>No attachments.</div> : null}
      </div>
    </div>
  );
}

