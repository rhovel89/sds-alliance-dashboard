import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { MAIL_MEDIA_BUCKET } from "../../lib/storageBuckets";

type Att = { path: string; name: string; mime: string };

function isImage(att: Att) {
  const m = (att.mime || "").toLowerCase();
  if (m.startsWith("image/")) return true;
  const n = (att.name || "").toLowerCase();
  return n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".gif") || n.endsWith(".webp");
}

function parse(body: string): { text: string; atts: Att[] } {
  const lines = String(body || "").split("\n");
  const atts: Att[] = [];
  const kept: string[] = [];

  for (const ln of lines) {
    const m = ln.match(/^\[\[mailatt:(.+)\|(.+)\|(.+)\]\]$/);
    if (m) atts.push({ path: m[1], name: m[2], mime: m[3] });
    else kept.push(ln);
  }
  return { text: kept.join("\n").trim(), atts };
}

export default function MailMessageBody(props: { body: string }) {
  const parsed = useMemo(() => parse(props.body), [props.body]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [me, setMe] = useState<string>("");
  const [deleted, setDeleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      setMe(u.data?.user?.id || "");
    })();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const next: Record<string, string> = {};
      for (const a of parsed.atts.slice(0, 12)) {
        if (deleted[a.path]) continue;
        const s = await supabase.storage.from(MAIL_MEDIA_BUCKET).createSignedUrl(a.path, 60 * 30);
        if (!s.error && s.data?.signedUrl) next[a.path] = s.data.signedUrl;
      }
      if (alive) setUrls(next);
    })();
    return () => { alive = false; };
  }, [parsed.atts, deleted]);

  async function open(path: string) {
    const s = await supabase.storage.from(MAIL_MEDIA_BUCKET).createSignedUrl(path, 60 * 30);
    if (s.error || !s.data?.signedUrl) return alert(s.error?.message || "Could not open.");
    window.open(s.data.signedUrl, "_blank");
  }

  function canDelete(path: string) {
    // Our uploader stores keys as: <uploaderUid>/<timestamp>-filename
    return !!me && path.startsWith(me + "/");
  }

  async function del(path: string) {
    const ok = confirm("Delete this attachment file? (The message text will still show the attachment marker.)");
    if (!ok) return;

    const r = await supabase.storage.from(MAIL_MEDIA_BUCKET).remove([path]);
    if (r.error) return alert(r.error.message);

    setDeleted((prev) => ({ ...prev, [path]: true }));
    alert("Deleted ✅");
  }

  return (
    <div>
      {parsed.text ? <div style={{ whiteSpace: "pre-wrap" }}>{parsed.text}</div> : null}

      {parsed.atts.length ? (
        <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 10 }}>
          <div style={{ fontWeight: 900, opacity: 0.95 }}>Attachments</div>

          <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {parsed.atts.map((a) => (
              <div key={a.path} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 10, width: 240 }}>
                <div style={{ fontWeight: 900, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.name} {deleted[a.path] ? " (deleted)" : ""}
                </div>
                <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>{a.mime}</div>

                {isImage(a) && urls[a.path] ? (
                  <img src={urls[a.path]} alt={a.name} style={{ marginTop: 8, width: "100%", height: "auto", borderRadius: 10, display: "block" }} />
                ) : null}

                <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => void open(a.path)} disabled={!!deleted[a.path]}>Open</button>
                  {canDelete(a.path) ? (
                    <button type="button" onClick={() => void del(a.path)} disabled={!!deleted[a.path]}>Delete</button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
            Note: deleting removes the file from storage. The original message text still contains the attachment marker line.
          </div>
        </div>
      ) : null}
    </div>
  );
}
