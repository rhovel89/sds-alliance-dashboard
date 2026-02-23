import React, { useEffect, useMemo, useState } from "react";

type Draft = {
  id: string;
  to: string;
  subject: string;
  body: string;
  createdUtc: string;
  updatedUtc: string;
};

const KEY = "sad_mail_drafts_v1";

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function nowUtc() {
  return new Date().toISOString();
}

function loadDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as Draft[];
  } catch {
    return [];
  }
}

function saveDrafts(d: Draft[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {}
}

export default function MyMailPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => (selectedId ? drafts.find((d) => d.id === selectedId) || null : null),
    [drafts, selectedId]
  );

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    const d = loadDrafts();
    setDrafts(d);
  }, []);

  useEffect(() => {
    saveDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    if (!selected) {
      setTo("");
      setSubject("");
      setBody("");
    } else {
      setTo(selected.to || "");
      setSubject(selected.subject || "");
      setBody(selected.body || "");
    }
  }, [selectedId]);

  function newDraft() {
    setSelectedId(null);
    setTo("");
    setSubject("");
    setBody("");
  }

  function save() {
    const now = nowUtc();
    if (!to.trim() && !subject.trim() && !body.trim()) {
      return window.alert("Draft is empty.");
    }

    if (!selectedId) {
      const d: Draft = {
        id: uid(),
        to: to.trim(),
        subject: subject.trim(),
        body,
        createdUtc: now,
        updatedUtc: now,
      };
      setDrafts((p) => [d, ...(p || [])]);
      setSelectedId(d.id);
      return;
    }

    setDrafts((p) =>
      (p || []).map((x) =>
        x.id === selectedId
          ? { ...x, to: to.trim(), subject: subject.trim(), body, updatedUtc: now }
          : x
      )
    );
  }

  function del(id: string) {
    if (!window.confirm("Delete this draft?")) return;
    setDrafts((p) => (p || []).filter((x) => x.id !== id));
    if (selectedId === id) newDraft();
  }

  async function copySupportBundle() {
    const payload = {
      tsUtc: nowUtc(),
      href: window.location.href,
      path: window.location.pathname,
      draftsCount: drafts.length,
      selectedDraft: selectedId,
      userAgent: navigator.userAgent,
    };
    const txt = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(txt);
      window.alert("Copied support bundle.");
    } catch {
      window.prompt("Copy support bundle:", txt);
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>✉️ My Mail (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copySupportBundle}>
            Copy Support Bundle
          </button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={newDraft}>
            + New Draft
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(260px, 1fr) minmax(300px, 1.2fr)", gap: 12 }}>
        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>Drafts ({drafts.length})</div>
          <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
            {drafts.map((d) => {
              const sel = d.id === selectedId;
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  style={{
                    cursor: "pointer",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: sel ? "rgba(120,255,120,0.10)" : "rgba(0,0,0,0.20)",
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 13 }}>{d.subject || "(no subject)"}</div>
                  <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>To: {d.to || "(unspecified)"}</div>
                  <div style={{ opacity: 0.6, fontSize: 11, marginTop: 6 }}>
                    Updated: {d.updatedUtc ? new Date(d.updatedUtc).toLocaleString() : ""}
                  </div>
                  <button
                    className="zombie-btn"
                    style={{ padding: "6px 8px", fontSize: 12, marginTop: 8 }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      del(d.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
            {drafts.length === 0 ? <div style={{ opacity: 0.75 }}>No drafts yet.</div> : null}
          </div>
        </div>

        <div className="zombie-card">
          <div style={{ fontWeight: 900 }}>{selected ? "Edit Draft" : "New Draft"}</div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>To</div>
            <input className="zombie-input" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} placeholder="Alliance / Player / Tag…" />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Subject</div>
            <input className="zombie-input" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "100%", padding: "10px 12px" }} placeholder="Subject…" />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Body</div>
            <textarea className="zombie-input" value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", minHeight: 180, padding: "10px 12px" }} placeholder="Write message…" />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={save}>
              Save Draft
            </button>
            <button
              className="zombie-btn"
              style={{ padding: "10px 12px" }}
              onClick={async () => {
                const msg = `TO: ${to}\nSUBJECT: ${subject}\n\n${body}`;
                try {
                  await navigator.clipboard.writeText(msg);
                  window.alert("Copied message text.");
                } catch {
                  window.prompt("Copy message:", msg);
                }
              }}
            >
              Copy Text
            </button>
          </div>

          <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
            UI-only (local drafts). Later we’ll wire to Supabase tables + RLS.
          </div>
        </div>
      </div>
    </div>
  );
}