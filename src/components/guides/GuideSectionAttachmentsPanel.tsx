import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { GUIDE_MEDIA_BUCKET } from "../../lib/storageBuckets";

type Row = {
  id: string;
  storage_path: string;
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
  return n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".gif") || n.endsWith(".webp") || n.endsWith(".bmp");
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

  const imageRows = useMemo(() => rows.filter(isImage), [rows]);
  const fileRows = useMemo(() => rows.filter((r) => !isImage(r)), [rows]);

  async function load() {
    const res = await supabase
      .from("v_guide_section_attachments")
      .select("*")
      .eq("section_id", sectionId)
      .order("created_at", { ascending: true });

    if (res.error) {
      setStatus(res.error.message);
      setRows([]);
      setPreviewUrls({});
      return;
    }

    const list = (res.data ?? []) as any as Row[];
    setRows(list);
    setStatus("");

    const next: Record<string, string> = {};
    for (const r of list.filter(isImage)) {
      const signed = await supabase.storage
        .from(GUIDE_MEDIA_BUCKET)
        .createSignedUrl(r.storage_path, 60 * 30);

      if (!signed.error && signed.data?.signedUrl) {
        next[r.id] = signed.data.signedUrl;
      }
    }
    setPreviewUrls(next);
  }

  useEffect(() => {
    if (sectionId) void load();
  }, [sectionId]);

  async function upload(files: FileList | null) {
    if (!canEdit) return;
    if (!files || !files.length) return;

    const userRes = await supabase.auth.getUser();
    const uid = userRes.data?.user?.id || null;
    if (!uid) {
      setStatus("You must be logged in to upload.");
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = safeKeyPart(file.name);
      const key = `${String(allianceCode || "").toUpperCase()}/sections/${sectionId}/${Date.now()}-${safeName}`;

      setStatus(`Uploading ${i + 1}/${files.length}…`);

      const up = await supabase.storage.from(GUIDE_MEDIA_BUCKET).upload(key, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

      if (up.error) {
        setStatus(up.error.message);
        return;
      }

      const ins = await supabase.from("v_guide_section_attachments").insert({
        alliance_code: String(allianceCode || "").toUpperCase(),
        section_id: sectionId,
        entry_id: "",
        storage_path: key,
        file_name: file.name,
        mime_type: file.type || null,
        size_bytes: file.size || null,
      });

      if (ins.error) {
        setStatus(ins.error.message);
        return;
      }
    }

    setStatus("Uploaded ✅");
    await load();
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function openFile(r: Row) {
    const signed = await supabase.storage
      .from(GUIDE_MEDIA_BUCKET)
      .createSignedUrl(r.storage_path, 60 * 30);

    if (signed.error || !signed.data?.signedUrl) {
      alert(signed.error?.message || "Could not open file.");
      return;
    }

    window.open(signed.data.signedUrl, "_blank");
  }

  async function remove(r: Row) {
    if (!canEdit) return;
    const ok = confirm("Delete this section attachment?");
    if (!ok) return;

    setStatus("Deleting…");

    const delObj = await supabase.storage.from(GUIDE_MEDIA_BUCKET).remove([r.storage_path]);
    if (delObj.error) {
      setStatus(delObj.error.message);
      return;
    }

    const delRow = await supabase
      .from("v_guide_section_attachments")
      .delete()
      .eq("id", r.id);

    if (delRow.error) {
      setStatus(delRow.error.message);
      return;
    }

    setStatus("Deleted ✅");
    await load();
    window.setTimeout(() => setStatus(""), 1200);
  }

  return (
    <div
      className="zombie-card"
      style={{
        padding: 14,
        borderRadius: 16,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950 }}>Section Attachments</div>
          <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
            Section-wide reference images and files.
          </div>
        </div>
        <div style={{ opacity: 0.75, fontSize: 12 }}>{status}</div>
      </div>

      {canEdit ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            padding: 12,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <input
            type="file"
            multiple
            onChange={(e) => void upload(e.target.files)}
            style={{ width: "100%" }}
          />
          <div style={{ marginTop: 6, opacity: 0.72, fontSize: 12 }}>
            Choose one or many files from desktop or phone.
          </div>
        </div>
      ) : null}

      {imageRows.length ? (
        <div style={{ display: "grid", gap: 16 }}>
          {imageRows.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 16,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              {previewUrls[r.id] ? (
                <img
                  src={previewUrls[r.id]}
                  alt={r.file_name}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "auto",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    minHeight: 220,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    opacity: 0.75,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  preview loading…
                </div>
              )}

              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{r.file_name}</div>
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
                    {prettySize(r.size_bytes)} {r.created_at ? `• ${new Date(r.created_at).toLocaleString()}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="zombie-btn" onClick={() => void openFile(r)}>Open</button>
                  {canEdit ? (
                    <button type="button" className="zombie-btn" onClick={() => void remove(r)}>Delete</button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {fileRows.length ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 16,
            padding: 12,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Other Files</div>

          <div style={{ display: "grid", gap: 8 }}>
            {fileRows.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <button type="button" onClick={() => void openFile(r)} style={{ textAlign: "left" }}>
                  {r.file_name} {r.size_bytes ? <span style={{ opacity: 0.7 }}>({prettySize(r.size_bytes)})</span> : null}
                </button>

                {canEdit ? (
                  <button type="button" className="zombie-btn" onClick={() => void remove(r)}>Delete</button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!rows.length ? (
        <div style={{ opacity: 0.72, fontSize: 12 }}>No section attachments.</div>
      ) : null}
    </div>
  );
}
