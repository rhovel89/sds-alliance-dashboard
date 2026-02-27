import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Row = {
  id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

function prettySize(n?: number | null) {
  if (!n || n <= 0) return "";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function safeKeyPart(s: string) {
  return String(s || "").replace(/[^\w.\-]+/g, "_");
}

export default function GuideEntryAttachmentsPanel(props: {
  allianceCode: string;
  entryId: string;
  canEdit: boolean;
}) {
  const { allianceCode, entryId, canEdit } = props;

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");

  async function load() {
    if (!entryId) return;
    const res = await supabase
      .from("guide_entry_attachments")
      .select("*")
      .eq("entry_id", entryId)
      .order("created_at", { ascending: false });

    if (res.error) {
      setStatus(res.error.message);
      setRows([]);
      return;
    }

    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, [entryId]);

  async function upload(files: FileList | null) {
    if (!canEdit) return;
    if (!files || !files.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = safeKeyPart(file.name);
      const key = `${String(allianceCode || "").toUpperCase()}/${entryId}/${Date.now()}-${safeName}`;

      setStatus(`Uploading ${i + 1}/${files.length}…`);
      const up = await supabase.storage.from("guide-media").upload(key, file, { upsert: false });
      if (up.error) { setStatus(up.error.message); return; }

      const ins = await supabase.from("guide_entry_attachments").insert({
        alliance_code: String(allianceCode || "").toUpperCase(),
        entry_id: entryId,
        file_path: key,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size || null,
      });

      if (ins.error) { setStatus(ins.error.message); return; }
    }

    setStatus("Uploaded ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  async function openFile(r: Row) {
    const signed = await supabase.storage.from("guide-media").createSignedUrl(r.file_path, 60);
    if (signed.error || !signed.data?.signedUrl) return alert(signed.error?.message || "Could not open file.");
    window.open(signed.data.signedUrl, "_blank");
  }

  async function remove(r: Row) {
    if (!canEdit) return;
    const ok = confirm("Delete this attachment?");
    if (!ok) return;

    setStatus("Deleting…");
    const delObj = await supabase.storage.from("guide-media").remove([r.file_path]);
    if (delObj.error) { setStatus(delObj.error.message); return; }

    const delRow = await supabase.from("guide_entry_attachments").delete().eq("id", r.id);
    if (delRow.error) { setStatus(delRow.error.message); return; }

    setStatus("Deleted ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  return (
    <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900, opacity: 0.95 }}>Attachments</div>
        <div style={{ opacity: 0.75, fontSize: 12 }}>{status}</div>
      </div>

      {canEdit ? (
        <div style={{ marginTop: 8 }}>
          <input type="file" multiple onChange={(e) => void upload(e.target.files)} />
        </div>
      ) : null}

      <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={() => void openFile(r)} style={{ textAlign: "left" }}>
              {r.file_name} {r.size_bytes ? <span style={{ opacity: 0.7 }}>({prettySize(r.size_bytes)})</span> : null}
            </button>
            {canEdit ? <button type="button" onClick={() => void remove(r)}>Delete</button> : null}
          </div>
        ))}
        {!rows.length ? <div style={{ opacity: 0.75, fontSize: 12 }}>No attachments.</div> : null}
      </div>
    </div>
  );
}
