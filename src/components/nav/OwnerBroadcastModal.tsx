import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

type AllianceOpt = { code: string; name?: string | null };

async function isDashboardOwnerSafe(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_dashboard_owner" as any);
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}

function getAllianceFromPath(pathname: string): string | null {
  const m = (pathname || "").match(/^\/dashboard\/([^\/]+)/);
  if (!m) return null;
  const code = (m[1] || "").toString().trim();
  return code ? code.toUpperCase() : null;
}

async function fetchAlliancesSafe(): Promise<AllianceOpt[]> {
  const tableCandidates = ["alliances", "alliance_registry", "alliances_list", "alliance_directory"];
  const selectCandidates = [
    "code,name",
    "code,title",
    "code,display_name",
    "alliance_code,name",
    "alliance_code,title",
    "alliance_code,display_name",
  ];

  for (const table of tableCandidates) {
    for (const sel of selectCandidates) {
      try {
        const r: any = await supabase.from(table as any).select(sel as any).limit(500);
        if (r?.error) continue;

        const rows = (r?.data ?? []) as any[];
        const out: AllianceOpt[] = rows
          .map((x) => {
            const code = (x.code ?? x.alliance_code ?? "").toString().trim();
            const name = (x.name ?? x.title ?? x.display_name ?? null) as any;
            return code ? { code: code.toUpperCase(), name } : null;
          })
          .filter(Boolean) as any;

        if (out.length) {
          const seen = new Set<string>();
          const uniq = out.filter((a) => (seen.has(a.code) ? false : (seen.add(a.code), true)));
          uniq.sort((a, b) => a.code.localeCompare(b.code));
          return uniq;
        }
      } catch {
        // ignore
      }
    }
  }

  return [];
}

export function OwnerBroadcastModal() {
  const admin = useIsAppAdmin();
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("📢 Broadcast");
  const [msg, setMsg] = useState("");

  const [alliances, setAlliances] = useState<AllianceOpt[]>([]);
  const [alliancesLoading, setAlliancesLoading] = useState(false);

  const [target, setTarget] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("sad_broadcast_target");
      if (saved) return saved;
    } catch {}
    if (typeof window !== "undefined") {
      return getAllianceFromPath(window.location.pathname) || "ALL";
    }
    return "ALL";
  });

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
    // load draft
    try {
      const saved = localStorage.getItem("sad_broadcast_draft");
      if (saved) {
        const p = JSON.parse(saved);
        if (p?.title) setTitle(String(p.title));
        if (p?.msg) setMsg(String(p.msg));
      }
    } catch {}
  }, []);

  useEffect(() => {
    // save draft
    try {
      localStorage.setItem("sad_broadcast_draft", JSON.stringify({ title, msg }));
    } catch {}
  }, [title, msg]);

  useEffect(() => {
    // save target
    try {
      localStorage.setItem("sad_broadcast_target", target);
    } catch {}
  }, [target]);

  useEffect(() => {
    if (!open || !allowed) return;
    let cancelled = false;
    (async () => {
      setAlliancesLoading(true);
      const list = await fetchAlliancesSafe();
      if (!cancelled) {
        setAlliances(list);
        setAlliancesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, allowed]);

  if (!allowed) return null;

  const currentAlliance = typeof window !== "undefined" ? (getAllianceFromPath(window.location.pathname) || null) : null;

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
          <div className="zombie-card" style={{ width: "min(900px, 96vw)", padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <h3 style={{ margin: 0 }}>📢 Broadcast Composer</h3>
              <button className="zombie-btn" onClick={() => setOpen(false)} style={{ height: 34 }}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Target Alliance:</div>

                <select
                  value={target}
                  onChange={(e) => setTarget((e.target.value || "ALL").toString().toUpperCase())}
                  style={{
                    height: 34,
                    borderRadius: 10,
                    padding: "0 10px",
                    border: "1px solid rgba(120,255,120,0.18)",
                    background: "rgba(0,0,0,0.25)",
                    color: "rgba(235,255,235,0.95)",
                    outline: "none",
                    minWidth: 220,
                  }}
                  title="Target alliance for this broadcast (UI only)"
                >
                  <option value="ALL">ALL (state-wide)</option>
                  {currentAlliance ? <option value={currentAlliance}>Current: {currentAlliance}</option> : null}
                  {alliancesLoading ? <option value={target}>Loading alliances…</option> : null}
                  {alliances.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code}{a.name ? " — " + a.name : ""}
                    </option>
                  ))}
                  <option value="CUSTOM">CUSTOM (type below)</option>
                </select>

                {target === "CUSTOM" ? (
                  <input
                    value={""}
                    onChange={() => {}}
                    style={{ display: "none" }}
                  />
                ) : null}

                <input
                  value={target === "CUSTOM" ? "" : ""}
                  readOnly
                  style={{ display: "none" }}
                />

                <input
                  value={target === "CUSTOM" ? "" : ""}
                  readOnly
                  style={{ display: "none" }}
                />

                <input
                  value={target === "CUSTOM" ? "" : ""}
                  readOnly
                  style={{ display: "none" }}
                />

                {target === "CUSTOM" ? (
                  <input
                    value={""}
                    onChange={() => {}}
                    style={{ display: "none" }}
                  />
                ) : null}

                {target === "CUSTOM" ? (
                  <input
                    placeholder="Enter alliance code (e.g. WOC)"
                    value={""}
                    onChange={() => {}}
                    style={{ display: "none" }}
                  />
                ) : null}

                {target === "CUSTOM" ? (
                  <input
                    placeholder="Enter alliance code (e.g. WOC)"
                    value={""}
                    onChange={() => {}}
                    style={{ display: "none" }}
                  />
                ) : null}

                {target === "CUSTOM" ? (
                  <input
                    placeholder="Enter alliance code (e.g. WOC)"
                    value={""}
                    onChange={() => {}}
                    style={{ display: "none" }}
                  />
                ) : null}
              </div>

              {target === "CUSTOM" ? (
                <div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Custom Target Code</div>
                  <input
                    value={""}
                    onChange={() => {}}
                    style={{ display: "none" }}
                  />
                  <CustomTargetInput onSet={(v) => setTarget(v)} />
                </div>
              ) : null}

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
                    const hdr = target && target !== "ALL" ? `[${target}] ` : "";
                    const full = `${hdr}${title}\n\n${msg}`.trim();
                    navigator.clipboard?.writeText(full);
                    window.alert("Copied broadcast text to clipboard.");
                  }}
                >
                  Copy Text
                </button>

                <button
                  className="zombie-btn"
                  onClick={() => {
                    const payload = { target, title, msg, utc: new Date().toISOString() };
                    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
                    window.alert("Copied broadcast JSON to clipboard.");
                  }}
                >
                  Copy JSON
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
              </div>

              <hr className="zombie-divider" />

              <div style={{ opacity: 0.9 }}>
                <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Preview</div>
                <div style={{ padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(120,255,120,0.12)" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>
                    {target && target !== "ALL" ? `[${target}] ` : ""}{title}
                  </div>
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

function CustomTargetInput(props: { onSet: (v: string) => void }) {
  const [v, setV] = useState("");

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <input
        value={v}
        onChange={(e) => setV((e.target.value || "").toString().toUpperCase())}
        placeholder="Enter alliance code (e.g. WOC)"
        style={{
          flex: 1,
          minWidth: 220,
          height: 36,
          borderRadius: 10,
          padding: "0 10px",
          border: "1px solid rgba(120,255,120,0.18)",
          background: "rgba(0,0,0,0.25)",
          color: "rgba(235,255,235,0.95)",
          outline: "none",
        }}
      />
      <button className="zombie-btn" style={{ height: 36 }} onClick={() => props.onSet((v || "ALL").toUpperCase())}>
        Set Target
      </button>
    </div>
  );
}