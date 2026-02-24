import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";

type Entry = {
  id: string;
  state_code: string;
  alliance_code: string;
  tag: string;
  name: string;
  alliance_id: string | null;
  active: boolean;
  sort_order: number;
  notes: string;
  updated_at: string;
};

export default function AllianceDirectoryDbPage() {
  const [stateCode, setStateCode] = useState("789");
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [rows, setRows] = useState<Entry[]>([]);
  const [status, setStatus] = useState("");

  async function load() {
    setStatus("Loading…");
    const res = await supabase
      .from("alliance_directory_entries")
      .select("*")
      .eq("state_code", stateCode)
      .order("sort_order", { ascending: true })
      .order("alliance_code", { ascending: true });

    if (res.error) {
      setStatus(res.error.message);
      return;
    }
    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateCode]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyActive && !r.active) return false;
      if (!qq) return true;
      const hay = `${r.alliance_code} ${r.tag} ${r.name} ${r.notes}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, q, onlyActive]);

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Alliance Directory (DB)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        Shared Supabase directory. {status ? " • " + status : ""}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
        <label style={{ opacity: 0.8 }}>State</label>
        <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 100 }} />
        <button onClick={load}>Reload</button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search…" />
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
          active only
        </label>
        <div style={{ opacity: 0.75 }}>Showing {filtered.length}</div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map((r) => (
          <div key={r.id} style={{ border: "1px solid #333", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 900 }}>
              {r.tag ? `[${r.tag}] ` : ""}{r.name || r.alliance_code}
            </div>
            <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
              Code: {r.alliance_code} • alliance_id: {r.alliance_id ? r.alliance_id : "(none)"} • sort: {r.sort_order} • {r.active ? "active" : "inactive"}
            </div>
            {r.notes ? <div style={{ marginTop: 8, opacity: 0.9, whiteSpace: "pre-wrap" }}>{r.notes}</div> : null}
          </div>
        ))}
        {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No rows.</div> : null}
      </div>
    </div>
  );
}
