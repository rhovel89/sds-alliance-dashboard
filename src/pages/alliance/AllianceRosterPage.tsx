import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Row = {
  alliance_code: string;
  membership_id: string;
  player_id: string;
  player_name: string;
  role_key: string;
  role: string;
  hq_count: number;
  max_hq_level: number | null;
  hqs: any[] | null;
};

function csvEscape(v: any) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AllianceRosterPage() {
  const { alliance_id } = useParams();
  const allianceCode = String(alliance_id || "").toUpperCase();

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<string>("");

  const [q, setQ] = useState("");
  const [minHq, setMinHq] = useState("");

  async function load() {
    if (!allianceCode) return;
    setStatus("Loading…");
    const r = await supabase.rpc("get_alliance_roster", { p_alliance_code: allianceCode });
    if (r.error) { setStatus(r.error.message); setRows([]); return; }
    setRows((r.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, [allianceCode]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const min = minHq ? Number(minHq) : NaN;
    return rows.filter((x) => {
      const okName = !needle || (x.player_name || "").toLowerCase().includes(needle);
      const okHq = Number.isNaN(min) || ((x.max_hq_level ?? 0) >= min);
      return okName && okHq;
    });
  }, [rows, q, minHq]);

  async function copyJson() {
    try { await navigator.clipboard.writeText(JSON.stringify(filtered, null, 2)); alert("Copied JSON ✅"); }
    catch { alert("Copy failed."); }
  }

  function downloadCsv() {
    const header = ["player_name","role_key","role","hq_count","max_hq_level","hqs"];
    const lines = [header.join(",")];

    for (const r of filtered) {
      const hqs = Array.isArray(r.hqs) ? r.hqs.map((h:any) => `${h.hq_name || "HQ"}(L${h.hq_level ?? "?"})`).join(" | ") : "";
      lines.push([
        csvEscape(r.player_name),
        csvEscape(r.role_key),
        csvEscape(r.role),
        csvEscape(r.hq_count),
        csvEscape(r.max_hq_level ?? ""),
        csvEscape(hqs)
      ].join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alliance-roster-${allianceCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!allianceCode) return <div style={{ padding: 16 }}>Missing alliance code in URL.</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1300, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>🧟 Alliance Roster — {allianceCode}</h2>
          <div style={{ marginTop: 6, opacity: 0.85, fontSize: 12 }}>{status || `Members: ${filtered.length}`}</div>
        </div>
        <SupportBundleButton />
      </div>

      <div className="zombie-card" style={{ marginTop: 12, padding: 12, borderRadius: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search player name…" />
          <input value={minHq} onChange={(e) => setMinHq(e.target.value)} placeholder="Min HQ level" style={{ width: 120 }} />
          <button type="button" onClick={() => void load()}>Refresh</button>
          <button type="button" onClick={() => void copyJson()}>Copy JSON</button>
          <button type="button" onClick={downloadCsv}>Download CSV</button>
        </div>
        <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
          View-only roster. Editing HQ details stays in each player’s /me profile tools.
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {filtered.map((r) => (
          <div key={r.membership_id} className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>{r.player_name}</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                {r.role_key || r.role ? `${r.role_key || r.role}` : "member"}
              </div>
            </div>

            <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>
              HQs: <b>{r.hq_count}</b>
              {"  "}•{"  "}
              Max HQ Level: <b>{r.max_hq_level ?? "—"}</b>
            </div>

            {Array.isArray(r.hqs) && r.hqs.length ? (
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {r.hqs.slice(0, 6).map((h: any) => (
                  <span key={h.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "4px 10px", fontSize: 12, opacity: 0.95 }}>
                    {String(h.hq_name || "HQ")} (L{String(h.hq_level ?? "?")})
                  </span>
                ))}
                {r.hqs.length > 6 ? <span style={{ opacity: 0.75, fontSize: 12 }}>+{r.hqs.length - 6} more</span> : null}
              </div>
            ) : (
              <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>No HQs entered yet.</div>
            )}
          </div>
        ))}

        {!filtered.length && !status ? <div style={{ opacity: 0.8 }}>No members found.</div> : null}
      </div>
    </div>
  );
}
