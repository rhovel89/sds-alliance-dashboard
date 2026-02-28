import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Row = any;

export default function StateLeadersPage() {
  const { state_code } = useParams();
  const stateCode = String(state_code || "789");

  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Loading…");
    const r = await supabase
      .from("v_state_leaders")
      .select("*")
      .eq("state_code", stateCode)
      .order("rank", { ascending: true });

    if (r.error) { setStatus(r.error.message); setRows([]); return; }
    setRows(r.data ?? []);
    setStatus("");
  }

  useEffect(() => { void load(); }, [stateCode]);

  const grouped = useMemo(() => {
    const g: Record<string, Row[]> = {};
    for (const r of rows) {
      const k = String(r.role_key || "unknown");
      if (!g[k]) g[k] = [];
      g[k].push(r);
    }
    return g;
  }, [rows]);

  const roleOrder = useMemo(() => {
    const seen: Record<string, { rank: number; name: string }> = {};
    for (const r of rows) {
      const k = String(r.role_key);
      if (!seen[k]) seen[k] = { rank: Number(r.rank ?? 999), name: String(r.role_name || k) };
    }
    return Object.entries(seen).sort((a,b) => a[1].rank - b[1].rank);
  }, [rows]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏛️ State {stateCode} Leaders</h2>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>{status || "View-only leadership list."}</div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {roleOrder.map(([roleKey, meta]) => (
          <div key={roleKey} className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
            <div style={{ fontWeight: 950 }}>{meta.name}</div>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {(grouped[roleKey] || []).filter(x => x.user_id).map((x: any) => (
                <div key={String(x.user_id)} style={{ opacity: 0.92 }}>
                  • {String(x.user_display_name || x.user_id)}
                </div>
              ))}
              {(grouped[roleKey] || []).filter(x => x.user_id).length === 0 ? <div style={{ opacity: 0.75 }}>No assignments.</div> : null}
            </div>
          </div>
        ))}
        {!rows.length && !status ? <div style={{ opacity: 0.8 }}>No leader roles found.</div> : null}
      </div>
    </div>
  );
}
