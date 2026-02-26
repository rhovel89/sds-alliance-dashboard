import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";
import AllianceCodeMapSyncPanel from "../../components/owner/AllianceCodeMapSyncPanel";

const LS_KEY = "sad_alliance_directory_v1";

type DbRow = {
  state_code: string;
  alliance_code: string;
  alliance_id: string;
  active: boolean;
  sort_order: number | null;
  name: string | null;
  tag: string | null;
};

type LocalAlliance = {
  alliance_id: string;
  tag: string;
  name: string;
  state_code: string;
  active: boolean;
  sort_order: number;
};

function isUuid(x: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
}

function safeStr(x: any) {
  return typeof x === "string" ? x : (x == null ? "" : String(x));
}

function safeBool(x: any, fallback: boolean) {
  if (typeof x === "boolean") return x;
  return fallback;
}

function safeInt(x: any, fallback: number) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function readLocalRaw(): any {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (!s) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function writeLocalRaw(obj: any) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
}

function normalizeToAlliances(obj: any): LocalAlliance[] {
  const alliances: any[] = Array.isArray(obj?.alliances) ? obj.alliances : [];
  if (alliances.length) {
    return alliances.map((a, idx) => ({
      alliance_id: safeStr(a.alliance_id || a.id),
      tag: safeStr(a.tag || a.alliance_code || a.code),
      name: safeStr(a.name),
      state_code: safeStr(a.state_code || a.state),
      active: safeBool(a.active, true),
      sort_order: safeInt(a.sort_order, (idx + 1) * 10),
    })).filter((a) => isUuid(a.alliance_id) && !!a.tag && !!a.state_code);
  }

  // Legacy shape: { items: [{id, code, name, state}] }
  const items: any[] = Array.isArray(obj?.items) ? obj.items : [];
  return items.map((x, idx) => ({
    alliance_id: safeStr(x.id || x.alliance_id),
    tag: safeStr(x.code || x.tag || x.alliance_code),
    name: safeStr(x.name),
    state_code: safeStr(x.state || x.state_code),
    active: true,
    sort_order: (idx + 1) * 10,
  })).filter((a) => isUuid(a.alliance_id) && !!a.tag && !!a.state_code);
}

function buildLocalPayload(alliances: LocalAlliance[]) {
  const now = new Date().toISOString();
  return {
    version: 1,
    updatedUtc: now,
    // For your UI-only editor’s table detection:
    alliances: alliances,
    // Keep items too (so older parts of the UI/editor still understand it):
    items: alliances.map((a) => ({
      id: a.alliance_id,
      code: a.tag,
      name: a.name,
      state: a.state_code,
      createdUtc: now,
      updatedUtc: now,
    })),
  };
}

export default function OwnerAllianceDirectorySyncPage() {
  const [status, setStatus] = useState("");
  const [stateFilter, setStateFilter] = useState("789");
  const [localObj, setLocalObj] = useState<any>(null);
  const [alliances, setAlliances] = useState<LocalAlliance[]>([]);

  function reloadLocal() {
    const obj = readLocalRaw();
    setLocalObj(obj);
    setAlliances(obj ? normalizeToAlliances(obj) : []);
  }

  useEffect(() => { reloadLocal(); }, []);

  const byState = useMemo(() => {
    const map: Record<string, number> = {};
    alliances.forEach((a) => { map[a.state_code] = (map[a.state_code] || 0) + 1; });
    return map;
  }, [alliances]);

  async function pullFromDb() {
    setStatus("Pulling from DB…");
    let q = supabase.from("alliance_directory_entries").select("*").order("state_code", { ascending: true }).order("sort_order", { ascending: true });

    const sf = stateFilter.trim();
    if (sf) q = q.eq("state_code", sf);

    const res = await q.limit(2000);
    if (res.error) { setStatus(res.error.message); return; }

    const rows = (res.data ?? []) as any as DbRow[];
    const list: LocalAlliance[] = rows.map((r, idx) => ({
      alliance_id: safeStr(r.alliance_id),
      tag: safeStr(r.alliance_code || r.tag || ""),
      name: safeStr(r.name || r.alliance_code || ""),
      state_code: safeStr(r.state_code),
      active: safeBool(r.active, true),
      sort_order: safeInt(r.sort_order, (idx + 1) * 10),
    })).filter((a) => isUuid(a.alliance_id) && !!a.tag && !!a.state_code);

    const payload = buildLocalPayload(list);
    writeLocalRaw(payload);
    reloadLocal();

    setStatus(`Pulled ${list.length} rows → localStorage (${LS_KEY}) ✅`);
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function pushToDb() {
    setStatus("Pushing localStorage → DB…");

    const obj = readLocalRaw();
    if (!obj) { setStatus("Nothing in localStorage yet."); return; }

    const list = normalizeToAlliances(obj);
    if (!list.length) { setStatus("No alliances found in localStorage JSON."); return; }

    // Optional state filter: only push the selected state
    const sf = stateFilter.trim();
    const filtered = sf ? list.filter((a) => a.state_code === sf) : list;

    const payload = filtered.map((a) => ({
      state_code: a.state_code,
      alliance_code: a.tag,
      alliance_id: a.alliance_id,
      active: a.active,
      sort_order: a.sort_order,
      name: a.name,
      tag: a.tag,
    }));

    const res = await supabase
      .from("alliance_directory_entries")
      .upsert(payload, { onConflict: "state_code,alliance_code" });

    if (res.error) { setStatus(res.error.message); return; }

    setStatus(`Pushed ${payload.length} rows to DB ✅`);
    window.setTimeout(() => setStatus(""), 1200);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginTop: 12 }}>         <AllianceCodeMapSyncPanel />       </div>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Alliance Directory Sync (DB ↔ localStorage)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        Use this to sync the shared DB directory into your UI-only editor and push your edits back to DB.
        {status ? " • " + status : ""}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <label style={{ opacity: 0.75 }}>State filter</label>
        <input value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={{ width: 120 }} />
        <button onClick={pullFromDb}>Pull DB → localStorage</button>
        <button onClick={pushToDb}>Push localStorage → DB</button>
        <button onClick={reloadLocal}>Reload local</button>
        <a href="/owner/directory-editor" style={{ opacity: 0.9 }}>Open UI-only editor</a>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>LocalStorage Summary</div>
        <div style={{ padding: 12, display: "grid", gap: 8 }}>
          <div style={{ opacity: 0.85 }}>Key: <code>{LS_KEY}</code></div>
          <div style={{ opacity: 0.85 }}>Detected alliances: <b>{alliances.length}</b></div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            By state: {Object.keys(byState).length ? Object.entries(byState).map(([k,v]) => `${k}:${v}`).join(" • ") : "(none)"}
          </div>
          <details>
            <summary style={{ cursor: "pointer" }}>Raw local JSON</summary>
            <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", fontSize: 12, opacity: 0.9 }}>
{JSON.stringify(localObj, null, 2)}
            </pre>
          </details>
        </div>
      </div>

      <div style={{ marginTop: 12, border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Preview (from localStorage)</div>
        <div style={{ padding: 12, display: "grid", gap: 8 }}>
          {alliances.slice(0, 50).map((a) => (
            <div key={a.alliance_id} style={{ border: "1px solid #222", borderRadius: 10, padding: 10 }}>
              <div style={{ fontWeight: 900 }}>{a.state_code} • {a.tag} • {a.name}</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                {a.alliance_id} • active={String(a.active)} • sort={a.sort_order}
              </div>
            </div>
          ))}
          {alliances.length > 50 ? <div style={{ opacity: 0.7 }}>Showing first 50…</div> : null}
          {alliances.length === 0 ? <div style={{ opacity: 0.7 }}>No local alliances detected. Pull from DB first.</div> : null}
        </div>
      </div>
    </div>
  );
}

