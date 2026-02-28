import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { MAIL_MEDIA_BUCKET } from "../../lib/storageBuckets";

function safeKeyPart(s: string) {
  return String(s || "").replace(/[^\w.\-]+/g, "_");
}

export default function MailAttachmentUploader(props: {
  onAddMarkers: (markers: string) => void;
  maxFiles?: number;
}) {
  const [status, setStatus] = useState("");

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;

    const userRes = await supabase.auth.getUser();
    const uid = userRes.data?.user?.id || null;
    if (!uid) { setStatus("You must be logged in."); return; }

    const limit = props.maxFiles ?? 5;
    const count = Math.min(files.length, limit);

    const markers: string[] = [];
    for (let i = 0; i < count; i++) {
      const f = files[i];
      const key = `${uid}/${Date.now()}-${safeKeyPart(f.name)}`;

      setStatus(`Uploading ${i + 1}/${count}…`);
      const up = await supabase.storage.from(MAIL_MEDIA_BUCKET).upload(key, f, { upsert: false });
      if (up.error) { setStatus(up.error.message); return; }

      const mime = f.type || "application/octet-stream";
      markers.push(`[[mailatt:${key}|${f.name}|${mime}]]`);
    }

    setStatus("Attached ✅");
    props.onAddMarkers(markers.join("\n"));
    window.setTimeout(() => setStatus(""), 900);
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <input type="file" multiple onChange={(e) => void upload(e.target.files)} />
          <span style={{ opacity: 0.85, fontSize: 12 }}>Attach files</span>
        </label>
        <div style={{ opacity: 0.75, fontSize: 12 }}>{status}</div>
      </div>
      <div style={{ marginTop: 6, opacity: 0.7, fontSize: 12 }}>
        Bucket: <code>{MAIL_MEDIA_BUCKET}</code> • Max {props.maxFiles ?? 5} files
      </div>
    </div>
  );
}
