import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { STATE_MEDIA_BUCKET } from "../../lib/storageBuckets";

type Row = {
  id: string;
  bulletin_id: string;
  state_code: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  public_url: string;
  created_at: string;
};

function safeKeyPart(s: string) {
  return String(s || "").replace(/[^\w.\-]+/g, "_");
}
function isImage(r: Row) {
  const mt = (r.mime_type || "").toLowerCase();
  if (mt.startsWith("image/")) return true;
  const n = (r.file_name || "").toLowerCase();
  return n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".gif") || n.endsWith(".webp");
}

export default function StateBulletinAttachmentsPanel(props: { stateCode: string; bulletinId: string; canManage: boolean }) {
  const { stateCode, bulletinId, canManage } = props;

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState<Record<string, string>>({});

  const STORAGE_PUBLIC_BASE = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "") + "/storage/v1/object/";

  async function load() {
    const res = await supabase
      .from("state_bulletin_attachments")
      .select("*")
      .eq("bulletin_id", bulletinId)
      .order("created_at", { ascending: false });

    if (res.error) { setStatus(res.error.message); setRows([]); return; }
    const list = (res.data ?? []) as any as Row[];
    setRows(list);
    setStatus("");

    const imgs = list.filter(isImage).slice(0, 6);
    const next: Record<string, string> = {};
    for (const r of imgs) {
      const signed = await supabase.storage.from(STATE_MEDIA_BUCKET).createSignedUrl(r.storage_path, 60 * 30);
      if (!signed.error && signed.data?.signedUrl) next[r.id] = signed.data.signedUrl;
    }
    setPreview(next);
  }

  useEffect(() => { void load(); }, [bulletinId]);

  async function upload(files: FileList | null) {
    if (!canManage) return;
    if (!files || !files.length) return;

    const userRes = await supabase.auth.getUser();
    const uid = userRes.data?.user?.id || null;
    if (!uid) { setStatus("You must be logged in."); return; }

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const key = `${stateCode}/${bulletinId}/${Date.now()}-${safeKeyPart(f.name)}`;

      setStatus(`Uploading ${i + 1}/${files.length}…`);
      const up = await supabase.storage.from(STATE_MEDIA_BUCKET).upload(key, f, { upsert: false });
      if (up.error) { setStatus(up.error.message); return; }

      const ins = await supabase.from("state_bulletin_attachments").insert({
        state_code: stateCode,
        bulletin_id: bulletinId,
        uploader_user_id: uid,
        file_name: f.name,
        mime_type: f.type || null,
        size_bytes: f.size || null,
        storage_path: key,
        public_url: `${STORAGE_PUBLIC_BASE}${STATE_MEDIA_BUCKET}/${key}`,
      });

      if (ins.error) { setStatus(ins.error.message); return; }
    }

    setStatus("Uploaded ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  async function open(r: Row) {
    const signed = await supabase.storage.from(STATE_MEDIA_BUCKET).createSignedUrl(r.storage_path, 60 * 30);
    if (signed.error || !signed.data?.signedUrl) return alert(signed.error?.message || "Could not open.");
    window.open(signed.data.signedUrl, "_blank");
  }

  async function remove(r: Row) {
    if (!canManage) return;
    const ok = confirm("Delete attachment?");
    if (!ok) return;

    setStatus("Deleting…");
    const delObj = await supabase.storage.from(STATE_MEDIA_BUCKET).remove([r.storage_path]);
    if (delObj.error) { setStatus(delObj.error.message); return; }

    const delRow = await supabase.from("state_bulletin_attachments").delete().eq("id", r.id);
    if (delRow.error) { setStatus(delRow.error.message); return; }

    setStatus("Deleted ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  const imgs = useMemo(() => rows.filter(isImage), [rows]);

  return (
    <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900, opacity: 0.95 }}>Attachments</div>
        <div style={{ opacity: 0.75, fontSize: 12 }}>{status}</div>
      </div>

      {canManage ? (
        <div style={{ marginTop: 8 }}>
          <input type="file" multiple onChange={(e) => void upload(e.target.files)} />
          <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>Bucket: <code>{STATE_MEDIA_BUCKET}</code></div>
        </div>
      ) : null}

      {imgs.length ? (
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {imgs.slice(0, 6).map((r) => (
            <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 8 }}>
              {preview[r.id] ? (
                <img src={preview[r.id]} alt={r.file_name} style={{ width: 180, height: "auto", borderRadius: 10, display: "block" }} />
              ) : (
                <div style={{ width: 180, height: 120, opacity: 0.75, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  (preview…)
                </div>
              )}
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.file_name}
              </div>
              <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                <button type="button" onClick={() => void open(r)}>Open</button>
                {canManage ? <button type="button" onClick={() => void remove(r)}>Delete</button> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
