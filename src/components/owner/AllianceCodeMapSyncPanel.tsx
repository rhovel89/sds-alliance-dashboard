import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type MapRow = { alliance_code: string; alliance_id: string; created_at?: string; updated_at?: string };

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || "").trim());
}

function normCode(s: string) {
  return String(s || "").trim().toUpperCase();
}

export default function AllianceCodeMapSyncPanel() {
  const [rows, setRows] = useState<MapRow[]>([]);
  const [status, setStatus] = useState<string>("");

  const [code, setCode] = useState("");
  const [aid, setAid] = useState("");

  const [bulk, setBulk] = useState("");

  async function loadMap() {
    setStatus("Loading map…");
    const res = await supabase
      .from("alliance_code_map")
      .select("*")
      .order("alliance_code", { ascending: true });

    if (res.error) {
      setStatus(res.error.message);
      setRows([]);
      return;
    }

    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => {
    void loadMap();
  }, []);

  async function upsertOne(c: string, id: string) {
    const alliance_code = normCode(c);
    const alliance_id = String(id || "").trim();

    if (!alliance_code) return alert("Missing alliance code.");
    if (!isUuid(alliance_id)) return alert("Alliance ID must be a UUID.");

    setStatus("Saving…");
    const res = await supabase
      .from("alliance_code_map")
      .upsert([{ alliance_code, alliance_id }], { onConflict: "alliance_code" });

    if (res.error) {
      setStatus(res.error.message);
      return;
    }

    setStatus("Saved ✅");
    setCode("");
    setAid("");
    await loadMap();
    window.setTimeout(() => setStatus(""), 900);
  }

  async function removeOne(c: string) {
    const ok = confirm("Remove this mapping?");
    if (!ok) return;

    setStatus("Removing…");
    const res = await supabase.from("alliance_code_map").delete().eq("alliance_code", c);

    if (res.error) {
      setStatus(res.error.message);
      return;
    }

    setStatus("Removed ✅");
    await loadMap();
    window.setTimeout(() => setStatus(""), 900);
  }

  async function importBulk() {
    const raw = bulk.trim();
    if (!raw) return;

    let items: MapRow[] = [];

    try {
      if (raw.startsWith("[")) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          items = parsed
            .map((x: any) => ({
              alliance_code: normCode(x.alliance_code || x.code),
              alliance_id: String(x.alliance_id || x.id || "").trim(),
            }))
            .filter((x) => x.alliance_code && isUuid(x.alliance_id));
        }
      } else {
        items = raw
          .split(/\r?\n/)
          .map((ln) => ln.trim())
          .filter(Boolean)
          .map((ln) => {
            const parts = ln.split(/[,\t ]+/).filter(Boolean);
            return { alliance_code: normCode(parts[0]), alliance_id: String(parts[1] || "").trim() };
          })
          .filter((x) => x.alliance_code && isUuid(x.alliance_id));
      }
    } catch {
      return alert("Bulk parse failed. Use CODE,UUID per line or JSON array.");
    }

    if (!items.length) return alert("No valid rows found.");

    setStatus("Importing…");
    const res = await supabase.from("alliance_code_map").upsert(items as any, { onConflict: "alliance_code" });

    if (res.error) {
      setStatus(res.error.message);
      return;
    }

    setStatus("Imported ✅");
    setBulk("");
    await loadMap();
    window.setTimeout(() => setStatus(""), 900);
  }

  const pretty = useMemo(() => rows.map((r) => `${r.alliance_code},${r.alliance_id}`).join("\n"), [rows]);

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>Alliance Code Map (DB)</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            Add new alliances here once. This powers Access Control and anything that needs code⇄uuid. {status ? " • " + status : ""}
          </div>
        </div>
        <button type="button" onClick={() => void loadMap()}>Refresh</button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Alliance Code (e.g. WOC)" style={{ width: 180 }} />
          <input value={aid} onChange={(e) => setAid(e.target.value)} placeholder="Alliance UUID (e.g. d173...)" style={{ width: "min(520px, 100%)" }} />
          <button type="button" onClick={() => void upsertOne(code, aid)}>Save</button>
        </div>

        <details>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>Bulk import (CODE,UUID per line or JSON)</summary>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={6} placeholder={"WOC,d17347ee-2500-47ff-9c25-739a976d9027\nSDS,1cc45af2-4a0f-4e72-bd17-0466b91b0fa7"} />
            <button type="button" onClick={() => void importBulk()}>Import</button>
          </div>
        </details>

        <details>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>Current map (copy/paste)</summary>
          <textarea readOnly rows={6} value={pretty} />
        </details>

        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.alliance_code} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{r.alliance_code}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => void upsertOne(r.alliance_code, r.alliance_id)}>Re-save</button>
                  <button type="button" onClick={() => void removeOne(r.alliance_code)}>Remove</button>
                </div>
              </div>
              <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.9, marginTop: 6 }}>{r.alliance_id}</div>
            </div>
          ))}
          {!rows.length ? <div style={{ opacity: 0.8 }}>No mappings yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
