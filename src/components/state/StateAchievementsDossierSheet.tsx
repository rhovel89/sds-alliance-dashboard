import React, { useMemo } from "react";

export type DossierReqRow = {
  id?: string;
  state_code?: string;
  alliance_name?: string | null;
  alliance_code?: string | null;
  player_name?: string | null;

  achievement_name?: string | null;
  title?: string | null;
  type_name?: string | null;

  status?: string | null;
  current_count?: number | null;
  required_count?: number | null;

  created_at?: string | null;
  completed_at?: string | null;
};

function nowStamp() {
  try { return new Date().toLocaleString(); } catch { return ""; }
}

function safeStr(v: any) { return (v === null || v === undefined) ? "" : String(v); }

function normalizeStatus(s: string) {
  const t = safeStr(s).toLowerCase();
  if (!t) return "pending";
  if (t.includes("complete")) return "completed";
  if (t.includes("approve")) return "approved";
  if (t.includes("deny")) return "denied";
  if (t.includes("reject")) return "denied";
  return t;
}

function pillStyle(kind: string): React.CSSProperties {
  const k = normalizeStatus(kind);
  if (k === "completed") return { borderColor: "rgba(86,240,106,0.35)", background: "rgba(86,240,106,0.14)" };
  if (k === "denied") return { borderColor: "rgba(176,18,27,0.45)", background: "rgba(176,18,27,0.18)" };
  if (k === "approved") return { borderColor: "rgba(255,191,60,0.38)", background: "rgba(255,191,60,0.14)" };
  return { borderColor: "rgba(255,255,255,0.16)", background: "rgba(255,255,255,0.06)" };
}

export default function StateAchievementsDossierSheet(props: {
  stateCode: string;
  allianceFilter?: string;
  rows: DossierReqRow[];
}) {
  const stateCode = safeStr(props.stateCode || "");
  const allianceFilter = safeStr(props.allianceFilter || "ALL");
  const rows = props.rows || [];

  const filtered = useMemo(() => {
    const af = allianceFilter.trim().toLowerCase();
    if (!af || af === "all") return rows;
    return rows.filter((r) => safeStr(r.alliance_name || r.alliance_code).toLowerCase() === af);
  }, [rows, allianceFilter]);

  const stats = useMemo(() => {
    let total = filtered.length;
    let completed = 0;
    let pending = 0;
    let denied = 0;
    for (const r of filtered) {
      const s = normalizeStatus(safeStr(r.status));
      if (s === "completed") completed++;
      else if (s === "denied") denied++;
      else pending++;
    }
    return { total, completed, pending, denied };
  }, [filtered]);

  const topAlliances = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) {
      const k = safeStr(r.alliance_name || r.alliance_code || "Unknown");
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filtered]);

  return (
    <div
      id="dossier-capture"
      style={{
        width: 1100,
        maxWidth: "100%",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(1100px circle at 8% -10%, rgba(176,18,27,.34), transparent 55%)," +
          "radial-gradient(900px circle at 88% 0%, rgba(255,42,42,.14), transparent 52%)," +
          "linear-gradient(180deg, rgba(12,15,19,.98), rgba(7,8,10,.98))",
        boxShadow: "0 22px 70px rgba(0,0,0,.62)",
        overflow: "hidden",
        color: "rgba(255,255,255,.92)",
        position: "relative",
      }}
    >
      {/* grit scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.22,
          mixBlendMode: "overlay",
          background:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,.03), rgba(255,255,255,.03) 1px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 6px)",
        }}
      />

      <div style={{ position: "relative", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 950, letterSpacing: 0.8, textTransform: "uppercase", fontSize: 12, opacity: 0.92 }}>
              State {stateCode} • Achievements Dossier
            </div>
            <div style={{ marginTop: 6, fontSize: 22, fontWeight: 950, letterSpacing: 0.3 }}>
              OPERATIONS DOSSIER SHEET
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.72 }}>
              Generated: {nowStamp()} • Filter: {allianceFilter || "ALL"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(176,18,27,0.38)",
                background: "rgba(176,18,27,0.16)",
                fontWeight: 900,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                fontSize: 11,
              }}
            >
              CLASSIFIED • Z-OPS
            </div>

            <div
              style={{
                padding: "6px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.18)",
                fontSize: 12,
                opacity: 0.9,
              }}
            >
              Total: <b>{stats.total}</b> • Completed: <b>{stats.completed}</b> • Pending: <b>{stats.pending}</b> • Denied: <b>{stats.denied}</b>
            </div>
          </div>
        </div>

        {/* Alliance summary */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 14,
            padding: 12,
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 12, opacity: 0.9 }}>
            Alliance activity
          </div>
          {topAlliances.map(([k, v]) => (
            <div
              key={k}
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.18)",
                fontSize: 12,
                opacity: 0.92,
              }}
            >
              <b>{k}</b> • {v}
            </div>
          ))}
          {topAlliances.length === 0 ? <div style={{ opacity: 0.7, fontSize: 12 }}>No rows.</div> : null}
        </div>

        {/* Table */}
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "220px 220px 1fr 140px 140px",
              gap: 0,
              padding: "10px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.22)",
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              opacity: 0.9,
            }}
          >
            <div>Player</div>
            <div>Alliance</div>
            <div>Achievement</div>
            <div>Status</div>
            <div>Progress</div>
          </div>

          {filtered.slice(0, 38).map((r, idx) => {
            const player = safeStr(r.player_name || "Unknown");
            const alliance = safeStr(r.alliance_name || r.alliance_code || "Unknown");
            const ach = safeStr(r.achievement_name || r.title || r.type_name || "Achievement");
            const st = safeStr(r.status || "pending");
            const cur = (r.current_count ?? null);
            const req = (r.required_count ?? null);
            const prog = (cur !== null && req !== null) ? `${cur}/${req}` : "";

            return (
              <div
                key={safeStr(r.id || idx)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "220px 220px 1fr 140px 140px",
                  padding: "10px 12px",
                  borderBottom: idx === filtered.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                  fontSize: 12,
                  background: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.08)",
                }}
              >
                <div style={{ opacity: 0.92, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player}</div>
                <div style={{ opacity: 0.85, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{alliance}</div>
                <div style={{ opacity: 0.92 }}>{ach}</div>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px",
                      borderRadius: 999,
                      border: "1px solid",
                      fontWeight: 900,
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                      fontSize: 11,
                      ...pillStyle(st),
                    }}
                  >
                    {normalizeStatus(st)}
                  </span>
                </div>
                <div style={{ opacity: 0.8 }}>{prog}</div>
              </div>
            );
          })}

          {filtered.length > 38 ? (
            <div style={{ padding: 10, fontSize: 12, opacity: 0.7 }}>
              Showing first 38 rows. Use filters/export to narrow.
            </div>
          ) : null}
        </div>

        <div style={{ fontSize: 12, opacity: 0.62 }}>
          Generated by State Alliance Dashboard • RLS enforced • Discord send uses queue pipeline
        </div>
      </div>
    </div>
  );
}
