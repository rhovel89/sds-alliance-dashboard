import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SupportBundleButton from "../../components/system/SupportBundleButton";

const KEY = "sad_alliance_directory_v1";

type Row = { code: string; name?: string | null; state?: string | null };

function loadLocal(): Row[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const items = parsed?.items;
    if (!Array.isArray(items)) return [];
    return items
      .filter((x: any) => x && x.code)
      .map((x: any) => ({
        code: String(x.code).toUpperCase(),
        name: x.name ?? null,
        state: x.state ?? null,
      }));
  } catch {
    return [];
  }
}

export default function AllianceDirectoryPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>(() => loadLocal());

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((x) => (x.code || "").toLowerCase().includes(qq) || (x.name || "").toLowerCase().includes(qq));
  }, [rows, q]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Alliance Directory (UI-only)</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => setRows(loadLocal())}>
            Reload from Editor
          </button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ padding: "10px 12px", minWidth: 220 }} />
          <div style={{ opacity: 0.75, fontSize: 12 }}>Alliances: {rows.length}</div>
        </div>
        <div style={{ marginTop: 8, opacity: 0.7, fontSize: 12 }}>
          This reads from localStorage directory store. Owner edits at <code>/owner/alliance-directory</code>.
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {filtered.map((a) => (
          <div key={a.code} className="zombie-card">
            <div style={{ fontWeight: 900, fontSize: 14 }}>{a.code}</div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>{a.name || a.code}</div>
            <div style={{ opacity: 0.65, marginTop: 6, fontSize: 12 }}>State: {a.state || "—"}</div>
            <button className="zombie-btn" style={{ width: "100%", marginTop: 12 }} onClick={() => nav("/dashboard/" + a.code)}>
              Open Dashboard
            </button>
          </div>
        ))}
        {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No matches.</div> : null}
      </div>
    </div>
  );
}