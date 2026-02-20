import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

async function isDashboardOwnerSafe(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_dashboard_owner" as any);
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

export function OwnerBroadcastModal() {
  const admin = useIsAppAdmin();
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("📢 Broadcast");
  const [msg, setMsg] = useState("");

  const allowed = useMemo(() => isOwner || admin.isAdmin, [isOwner, admin.isAdmin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const o = await isDashboardOwnerSafe();
      if (!cancelled) setIsOwner(o);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sad_broadcast_draft");
      if (saved) {
        const p = JSON.parse(saved);
        if (p?.title) setTitle(String(p.title));
        if (p?.msg) setMsg(String(p.msg));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("sad_broadcast_draft", JSON.stringify({ title, msg }));
    } catch {
      // ignore
    }
  }, [title, msg]);

  if (!allowed) return null;

  return (
    <>
      <button
        className="zombie-btn"
        style={{ height: 34, padding: "0 12px" }}
        onClick={() => setOpen(true)}
        title="Owner/Admin broadcast (UI only)"
      >
        📢 Broadcast
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0,0,0,0.62)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="zombie-card" style={{ width: "min(860px, 96vw)", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h3 style={{ margin: 0 }}>📢 Broadcast Composer</h3>
              <button className="zombie-btn" onClick={() => setOpen(false)} style={{ height: 34 }}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Title</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    borderRadius: 10,
                    padding: "0 10px",
                    border: "1px solid rgba(120,255,120,0.18)",
                    background: "rgba(0,0,0,0.25)",
                    color: "rgba(235,255,235,0.95)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Message</div>
                <textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  rows={10}
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    padding: 10,
                    border: "1px solid rgba(120,255,120,0.18)",
                    background: "rgba(0,0,0,0.25)",
                    color: "rgba(235,255,235,0.95)",
                    outline: "none",
                    resize: "vertical",
                  }}
                  placeholder="Type your broadcast message here…"
                />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="zombie-btn"
                  onClick={() => {
                    const full = `${title}\n\n${msg}`.trim();
                    navigator.clipboard?.writeText(full);
                    window.alert("Copied broadcast text to clipboard.");
                  }}
                >
                  Copy to Clipboard
                </button>

                <button
                  className="zombie-btn"
                  onClick={() => {
                    setMsg("");
                    window.alert("Cleared message.");
                  }}
                >
                  Clear Message
                </button>

                <button
                  className="zombie-btn"
                  onClick={() => {
                    const payload = { title, msg, utc: new Date().toISOString() };
                    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
                    window.alert("Copied broadcast JSON to clipboard.");
                  }}
                >
                  Copy JSON
                </button>
              </div>

              <hr className="zombie-divider" />

              <div style={{ opacity: 0.9 }}>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Preview</div>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(120,255,120,0.12)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg || "(empty)"}</div>
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                  UI-only: does not send to DB/Discord yet.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}