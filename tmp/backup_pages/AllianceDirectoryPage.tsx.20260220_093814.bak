import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { AllianceThemePicker } from "../../components/theme/AllianceThemePicker";

type AllianceRow = {
  code: string;
  name?: string | null;
  state?: string | null;
  sourceTable?: string | null;
};

const TABLE_CANDIDATES = ["alliances", "alliance_directory", "state_alliances"];

function pickCode(r: any): string {
  return (r?.code ?? r?.alliance_code ?? r?.tag ?? r?.abbr ?? "").toString().trim().toUpperCase();
}
function pickName(r: any): string {
  return (r?.name ?? r?.alliance_name ?? r?.title ?? "").toString().trim();
}
function pickState(r: any): string {
  const v = r?.state ?? r?.state_id ?? r?.state_number ?? r?.server ?? r?.world ?? null;
  if (v === null || v === undefined) return "Unknown";
  return v.toString().trim() || "Unknown";
}

export default function AllianceDirectoryPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AllianceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      for (const t of TABLE_CANDIDATES) {
        try {
          // Select * to avoid column mismatch; RLS may still block.
          const res = await supabase.from(t as any).select("*").limit(500);
          if (res.error) {
            // try next table
            continue;
          }
          const data = (res.data ?? []) as any[];
          const mapped = data
            .map((r) => {
              const code = pickCode(r);
              if (!code) return null;
              return {
                code,
                name: pickName(r) || code,
                state: pickState(r),
                sourceTable: t,
              } as AllianceRow;
            })
            .filter(Boolean) as AllianceRow[];

          if (!cancelled) {
            setRows(mapped);
            setLoading(false);
            return;
          }
        } catch {
          // try next table
        }
      }

      if (!cancelled) {
        setRows([]);
        setLoading(false);
        setError("No readable alliance directory table found (RLS or table missing). UI is ready — wire up a directory table when ready.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = (q || "").trim().toUpperCase();
    if (!s) return rows;
    return rows.filter((r) => r.code.includes(s) || (r.name || "").toUpperCase().includes(s) || (r.state || "").toUpperCase().includes(s));
  }, [rows, q]);

  const grouped = useMemo(() => {
    const m = new Map<string, AllianceRow[]>();
    for (const r of filtered) {
      const k = (r.state || "Unknown").toString();
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    const keys = Array.from(m.keys()).sort((a, b) => a.localeCompare(b));
    return keys.map((k) => ({ state: k, items: (m.get(k) || []).sort((a, b) => a.code.localeCompare(b.code)) }));
  }, [filtered]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>🧭 Alliance Directory</div>

        <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={() => nav("/state/789")}>
          🛰 State 789
        </button>

        <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={() => nav("/status")}>
          🧪 /status
        </button>

        <button className="zombie-btn" style={{ height: 34, padding: "0 12px" }} onClick={() => nav("/me")}>
          🧟 /me
        </button>
      </div>

      <div style={{ marginTop: 12, maxWidth: 720 }}>
        <AllianceThemePicker allianceCode={null} />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by code, name, or state…"
          style={{
            flex: 1,
            minWidth: 280,
            height: 36,
            borderRadius: 12,
            padding: "0 12px",
            border: "1px solid var(--sad-border, rgba(120,255,120,0.18))",
            background: "rgba(0,0,0,0.25)",
            color: "var(--sad-text, rgba(235,255,235,0.95))",
            outline: "none",
          }}
        />
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          {loading ? "Loading…" : `${filtered.length} alliance(s)`}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        {error ? (
          <div className="zombie-card" style={{ padding: 14, borderRadius: 16, border: "1px solid rgba(255,120,120,0.25)", background: "rgba(0,0,0,0.35)" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>⚠ Directory not ready</div>
            <div style={{ opacity: 0.85 }}>{error}</div>
          </div>
        ) : null}

        {loading ? (
          <div style={{ opacity: 0.75, marginTop: 12 }}>Loading directory…</div>
        ) : null}

        {!loading && !error ? (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {grouped.map((g) => (
              <div key={g.state} className="zombie-card" style={{ padding: 14, borderRadius: 16, background: "rgba(0,0,0,0.32)", border: "1px solid var(--sad-border, rgba(120,255,120,0.18))" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>State: {g.state}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>({g.items.length})</div>
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                  {g.items.map((a) => (
                    <button
                      key={a.code}
                      className="zombie-btn"
                      style={{ justifyContent: "space-between", display: "flex", gap: 10, padding: "10px 12px", height: "auto" }}
                      onClick={() => nav("/dashboard/" + a.code)}
                      title={a.sourceTable ? "source: " + a.sourceTable : undefined}
                    >
                      <span style={{ fontWeight: 900 }}>{a.code}</span>
                      <span style={{ opacity: 0.8 }}>{a.name || a.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
        UI-only. Reads from the first accessible table in: {TABLE_CANDIDATES.join(", ")}.
      </div>
    </div>
  );
}