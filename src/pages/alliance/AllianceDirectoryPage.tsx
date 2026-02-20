import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type AllianceRow = {
  code: string;
  name?: string | null;
  state?: string | null;
};

const SEED: AllianceRow[] = [
  { code: "WOC", name: "WOC", state: "789" },
  { code: "SDS", name: "SDS", state: "789" },
];

export default function AllianceDirectoryPage() {
  const nav = useNavigate();

  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [rows, setRows] = useState<AllianceRow[]>(SEED);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (stateFilter !== "all" && String(r.state || "") !== stateFilter) return false;
      if (!qq) return true;
      return String(r.code || "").toLowerCase().includes(qq) || String(r.name || "").toLowerCase().includes(qq);
    });
  }, [rows, q, stateFilter]);

  async function tryLoadFromDb() {
    setLoading(true);
    setMsg(null);
    try {
      // Optional: if you have an "alliances" table with RLS read policies, this will fill the directory.
      const r = await supabase.from("alliances" as any).select("code,name,state").limit(200);
      if (r.error) {
        setMsg("DB load failed (safe fallback to placeholders): " + r.error.message);
        setLoading(false);
        return;
      }
      const d = (r.data || []) as any[];
      const mapped: AllianceRow[] = d
        .filter((x) => x && x.code)
        .map((x) => ({ code: String(x.code).toUpperCase(), name: x.name ?? null, state: x.state ?? null }));
      setRows(mapped.length ? mapped : SEED);
      setMsg(mapped.length ? "Loaded from DB." : "DB returned no rows; using placeholders.");
    } catch {
      setMsg("DB load threw (safe fallback): network/error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>🧟 Alliance Directory</h2>
        <button className="zombie-btn" onClick={tryLoadFromDb} disabled={loading} style={{ padding: "10px 12px" }}>
          {loading ? "Loading…" : "Load from DB (optional)"}
        </button>
      </div>

      {msg ? <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>{msg}</div> : null}

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="zombie-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code or name…"
            style={{ minWidth: 220, padding: "10px 12px" }}
          />
          <select
            className="zombie-input"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{ padding: "10px 12px" }}
          >
            <option value="all">All states</option>
            <option value="789">State 789</option>
          </select>
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            {filtered.length} result(s)
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {filtered.map((a) => (
          <div key={a.code} className="zombie-card">
            <div style={{ fontWeight: 900, fontSize: 14 }}>{a.code}</div>
            <div style={{ opacity: 0.85, marginTop: 6 }}>{a.name || a.code}</div>
            <div style={{ opacity: 0.65, marginTop: 6, fontSize: 12 }}>State: {a.state || "—"}</div>
            <button
              className="zombie-btn"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => nav("/dashboard/" + String(a.code).toUpperCase())}
            >
              Open Dashboard
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}