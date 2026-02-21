import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AnyRow = Record<string, any>;

function normLower(v: any) { return String(v || "").trim().toLowerCase(); }
function asInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export default function OwnerStateAchievementsQueuePage() {
  const [stateCode, setStateCode] = useState("789");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [types, setTypes] = useState<AnyRow[]>([]);
  const [options, setOptions] = useState<AnyRow[]>([]);
  const [requests, setRequests] = useState<AnyRow[]>([]);

  const typeById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const t of types) if (t?.id) m[String(t.id)] = t;
    return m;
  }, [types]);

  const optionById = useMemo(() => {
    const m: Record<string, AnyRow> = {};
    for (const o of options) if (o?.id) m[String(o.id)] = o;
    return m;
  }, [options]);

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const t = await supabase
      .from("state_achievement_types")
      .select("*")
      .eq("state_code", stateCode)
      .order("name", { ascending: true });

    if (t.error) {
      setTypes([]); setOptions([]); setRequests([]);
      setMsg("Types load failed: " + t.error.message);
      setLoading(false);
      return;
    }

    const tData = (t.data as any[]) || [];
    setTypes(tData);

    const ids = tData.map((x) => x?.id).filter(Boolean);
    if (ids.length) {
      const op = await supabase
        .from("state_achievement_options")
        .select("*")
        .in("achievement_type_id", ids)
        .order("sort", { ascending: true })
        .order("label", { ascending: true });

      if (!op.error) setOptions((op.data as any[]) || []);
      else setOptions([]);
    } else {
      setOptions([]);
    }

    const r = await supabase
      .from("state_achievement_requests")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (r.error) {
      setRequests([]);
      setMsg("Requests load failed: " + r.error.message);
      setLoading(false);
      return;
    }

    setRequests((r.data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [stateCode]);

  async function updateRow(id: string, patch: AnyRow) {
    setMsg(null);
    const up = await supabase
      .from("state_achievement_requests")
      .update({ ...patch } as any)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (up.error) {
      setMsg("Update failed: " + up.error.message);
      return;
    }

    const row = up.data as any;
    setRequests((prev) => prev.map((x) => (String(x.id) === String(id) ? row : x)));
    setMsg("✅ Updated.");
  }

  async function markComplete(id: string) {
    const row = requests.find((x) => String(x.id) === String(id));
    if (!row) return;
    const req = Math.max(1, asInt(row.required_count, 1));
    await updateRow(id, {
      status: "completed",
      current_count: req,
      completed_at: new Date().toISOString()
    });
  }

  async function copyExport() {
    const payload = {
      version: 1,
      exportedUtc: new Date().toISOString(),
      state_code: stateCode,
      types,
      options,
      requests
    };
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); setMsg("✅ Copied export JSON."); }
    catch { window.prompt("Copy export JSON:", txt); }
  }

  function quickName(row: AnyRow) {
    const t = typeById[String(row.achievement_type_id)]?.name || "(unknown type)";
    const opt = row.option_id ? (optionById[String(row.option_id)]?.label || "") : "";
    return opt ? `${t} — ${opt}` : `${t}`;
  }

  function governorSummary() {
    const gov = types.find((t) => normLower(t.name) === "governor rotations");
    if (!gov?.id) return null;

    const tid = String(gov.id);
    const req = Math.max(1, asInt(gov.required_count, 3));

    const byPlayer: Record<string, number> = {};
    for (const r of requests) {
      if (String(r.achievement_type_id) !== tid) continue;
      const name = String(r.player_name || "").trim();
      if (!name) continue;
      const cur = Math.max(0, asInt(r.current_count, 0));
      byPlayer[name] = Math.max(byPlayer[name] || 0, cur);
    }

    const rows = Object.keys(byPlayer).map((k) => ({ player: k, cur: byPlayer[k] || 0 }))
      .sort((a, b) => (b.cur - a.cur) || a.player.localeCompare(b.player))
      .slice(0, 12);

    const done = rows.filter((x) => x.cur >= req).length;
    return { req, rows, done };
  }

  const gov = useMemo(() => governorSummary(), [types, requests]);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Owner — State Achievements Queue</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/owner/state-achievements")}>Back</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll}>Refresh</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyExport}>Export JSON</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>State</div>
          <input className="zombie-input" value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ padding: "10px 12px", width: 120 }} />
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            {loading ? "Loading…" : `types=${types.length} • options=${options.length} • requests=${requests.length}`}
          </div>
        </div>
        {msg ? <div style={{ marginTop: 10 }}>{msg}</div> : null}
      </div>

      {gov ? (
        <div className="zombie-card" style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>👑 Governor Rotations (Top)</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Required: {gov.req}</div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {gov.rows.map((r) => (
              <div key={r.player} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>{r.player}</div>
                <div style={{ marginLeft: "auto", fontWeight: 900 }}>{r.cur}/{gov.req}{r.cur >= gov.req ? " ✅" : ""}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>📥 Requests</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {requests.map((r) => {
            const id = String(r.id || "");
            const req = Math.max(1, asInt(r.required_count, asInt(typeById[String(r.achievement_type_id)]?.required_count, 1)));
            const cur = Math.max(0, asInt(r.current_count, 0));
            const done = String(r.status || "") === "completed" || cur >= req;

            return (
              <div key={id} style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>{String(r.player_name || "(no name)")}</div>
                  <div style={{ opacity: 0.7 }}>{String(r.alliance_name || "") ? `(${String(r.alliance_name)})` : ""}</div>
                  <div style={{ marginLeft: "auto", fontWeight: 900 }}>{cur}/{req}{done ? " ✅" : ""}</div>
                </div>

                <div style={{ opacity: 0.75, marginTop: 6 }}>
                  {quickName(r)}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>Status</div>
                  <select
                    className="zombie-input"
                    value={String(r.status || "submitted")}
                    onChange={(e) => updateRow(id, { status: e.target.value })}
                    style={{ padding: "8px 10px" }}
                  >
                    <option value="submitted">submitted</option>
                    <option value="in_progress">in_progress</option>
                    <option value="verified">verified</option>
                    <option value="completed">completed</option>
                    <option value="rejected">rejected</option>
                  </select>

                  <div style={{ opacity: 0.75, fontSize: 12 }}>Current</div>
                  <input
                    className="zombie-input"
                    value={String(cur)}
                    onChange={(e) => updateRow(id, { current_count: asInt(e.target.value, cur) })}
                    style={{ padding: "8px 10px", width: 90 }}
                  />

                  <div style={{ opacity: 0.75, fontSize: 12 }}>Required</div>
                  <input
                    className="zombie-input"
                    value={String(req)}
                    onChange={(e) => updateRow(id, { required_count: Math.max(1, asInt(e.target.value, req)) })}
                    style={{ padding: "8px 10px", width: 90 }}
                  />

                  <button className="zombie-btn" style={{ padding: "8px 10px", fontSize: 12 }} onClick={() => markComplete(id)}>
                    Mark Complete
                  </button>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 6 }}>Notes</div>
                  <textarea
                    className="zombie-input"
                    value={String(r.notes || "")}
                    onChange={(e) => updateRow(id, { notes: e.target.value })}
                    style={{ width: "100%", minHeight: 64, padding: "10px 12px" }}
                  />
                </div>

                <div style={{ opacity: 0.6, fontSize: 11, marginTop: 8 }}>
                  created={String(r.created_at || "—")} • completed={String(r.completed_at || "—")}
                </div>
              </div>
            );
          })}

          {!loading && requests.length === 0 ? <div style={{ opacity: 0.75 }}>No requests found.</div> : null}
        </div>
      </div>
    </div>
  );
}