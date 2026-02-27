import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { GUIDE_MEDIA_BUCKET } from "../../lib/storageBuckets";

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

function isImage(r: Row) {
  const mt = (r.mime_type || "").toLowerCase();
  if (mt.startsWith("image/")) return true;
  const n = (r.file_name || "").toLowerCase();
  return n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".gif") || n.endsWith(".webp");
}

export default function GuideSectionAttachmentsPanel(props: {
  allianceCode: string;
  sectionId: string;
  canEdit: boolean;
}) {
  const { allianceCode, sectionId, canEdit } = props;

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  async function load() {
    const res = await supabase
      .from("guide_section_attachments")
      .select("*")
      .eq("section_id", sectionId)
      .order("created_at", { ascending: false });

    if (res.error) {
      setStatus(res.error.message);
      setRows([]);
      return;
    }

    const list = (res.data ?? []) as any as Row[];
    setRows(list);
    setStatus("");

    const img = list.filter(isImage).slice(0, 8);
    const next: Record<string, string> = {};
    for (const r of img) {
      const signed = await supabase.storage.from(GUIDE_MEDIA_BUCKET).createSignedUrl(r.file_path, 60 * 30);
      if (!signed.error && signed.data?.signedUrl) next[r.id] = signed.data.signedUrl;
    }
    setPreviewUrls(next);
  }

  useEffect(() => { if (sectionId) void load(); }, [sectionId]);

  async function upload(files: FileList | null) {
    if (!canEdit) return;
    if (!files || !files.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = safeKeyPart(file.name);
      const key = `${String(allianceCode || "").toUpperCase()}/sections/${sectionId}/${Date.now()}-${safeName}`;

      setStatus(`Uploading ${i + 1}/${files.length}…`);
      const up = await supabase.storage.from(GUIDE_MEDIA_BUCKET).upload(key, file, { upsert: false });
      if (up.error) { setStatus(up.error.message); return; }

      const ins = await supabase.from("guide_section_attachments").insert({
        alliance_code: String(allianceCode || "").toUpperCase(),
        section_id: sectionId,
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
    const signed = await supabase.storage.from(GUIDE_MEDIA_BUCKET).createSignedUrl(r.file_path, 60 * 30);
    if (signed.error || !signed.data?.signedUrl) return alert(signed.error?.message || "Could not open file.");
    window.open(signed.data.signedUrl, "_blank");
  }

  async function remove(r: Row) {
    if (!canEdit) return;
    const ok = confirm("Delete this section attachment?");
    if (!ok) return;

    setStatus("Deleting…");
    const delObj = await supabase.storage.from(GUIDE_MEDIA_BUCKET).remove([r.file_path]);
    if (delObj.error) { setStatus(delObj.error.message); return; }

    const delRow = await supabase.from("guide_section_attachments").delete().eq("id", r.id);
    if (delRow.error) { setStatus(delRow.error.message); return; }

    setStatus("Deleted ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  const imgs = useMemo(() => rows.filter(isImage), [rows]);

  return (
    <div className="zombie-card" style={{ padding: 12, borderRadius: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>Section Attachments</div>
        <div style={{ opacity: 0.75, fontSize: 12 }}>{status}</div>
      </div>

      {canEdit ? (
        <div style={{ marginTop: 8 }}>
          <input type="file" multiple onChange={(e) => void upload(e.target.files)} />
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
            Bucket: <code>{GUIDE_MEDIA_BUCKET}</code>
          </div>
        </div>
      ) : null}

      {imgs.length ? (
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {imgs.slice(0, 8).map((r) => (
            <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 8 }}>
              {previewUrls[r.id] ? (
                <img src={previewUrls[r.id]} alt={r.file_name} style={{ width: 160, height: "auto", borderRadius: 10, display: "block" }} />
              ) : (
                <div style={{ width: 160, height: 100, opacity: 0.75, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  (preview loading…)
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.file_name}
              </div>
              <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                <button type="button" onClick={() => void openFile(r)}>Open</button>
                {canEdit ? <button type="button" onClick={() => void remove(r)}>Delete</button> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={() => void openFile(r)} style={{ textAlign: "left" }}>
              {r.file_name} {r.size_bytes ? <span style={{ opacity: 0.7 }}>({prettySize(r.size_bytes)})</span> : null}
            </button>
            {canEdit ? <button type="button" onClick={() => void remove(r)}>Delete</button> : null}
          </div>
        ))}
        {!rows.length ? <div style={{ opacity: 0.75, fontSize: 12 }}>No section attachments.</div> : null}
      </div>
    </div>
  );
}
