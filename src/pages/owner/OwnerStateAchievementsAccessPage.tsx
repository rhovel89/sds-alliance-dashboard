import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type AnyRow = Record<string, any>;

export default function OwnerStateAchievementsAccessPage() {
  const [stateCode, setStateCode] = useState("789");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [rows, setRows] = useState<AnyRow[]>([]);

  const [userId, setUserId] = useState("");
  const [canView, setCanView] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  async function loadAll() {
    setLoading(true);
    setMsg(null);

    const r = await supabase
      .from("state_achievement_access")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false });

    if (r.error) {
      setRows([]);
      setMsg("Access table load failed: " + r.error.message);
      setLoading(false);
      return;
    }

    setRows((r.data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, [stateCode]);

  async function addOrUpdate() {
    setMsg(null);
    const uid = userId.trim();
    if (!uid) return setMsg("User ID is required.");

    // Try upsert by (state_code,user_id) if possible; fallback to insert
    const payload: AnyRow = { state_code: stateCode, user_id: uid, can_view: !!canView, can_edit: !!canEdit };

    const up = await supabase
      .from("state_achievement_access")
      .upsert(payload as any, { onConflict: "state_code,user_id" } as any)
      .select("*");

    if (up.error) {
      // fallback insert
      const ins = await supabase.from("state_achievement_access").insert(payload as any).select("*");
      if (ins.error) {
        setMsg("Grant failed: " + ins.error.message);
        return;
      }
      setMsg("✅ Granted.");
      setUserId("");
      await loadAll();
      return;
    }

    setMsg("✅ Granted/updated.");
    setUserId("");
    await loadAll();
  }

  async function remove(row: AnyRow) {
    setMsg(null);
    if (!confirm("Remove this access grant?")) return;

    // Prefer delete by id if exists
    let del;
    if (row.id) {
      del = await supabase.from("state_achievement_access").delete().eq("id", row.id);
    } else {
      del = await supabase
        .from("state_achievement_access")
        .delete()
        .eq("state_code", stateCode)
        .eq("user_id", String(row.user_id || ""));
    }

    if (del.error) {
      setMsg("Remove failed: " + del.error.message);
      return;
    }

    setMsg("✅ Removed.");
    await loadAll();
  }

  async function copyExport() {
    const payload = { version: 1, exportedUtc: new Date().toISOString(), state_code: stateCode, rows };
    const txt = JSON.stringify(payload, null, 2);
    try { await navigator.clipboard.writeText(txt); setMsg("✅ Copied export JSON."); }
    catch { window.prompt("Copy export JSON:", txt); }
  }

  function importExport() {
    const raw = window.prompt("Paste export JSON:");
    if (!raw) return;
    try {
      const p = JSON.parse(raw);
      const rr = Array.isArray(p?.rows) ? p.rows : [];
      // apply sequentially (best effort)
      (async () => {
        for (const x of rr) {
          const payload: AnyRow = {
            state_code: stateCode,
            user_id: String(x.user_id || ""),
            can_view: !!x.can_view,
            can_edit: !!x.can_edit
          };
          if (!payload.user_id) continue;
          await supabase.from("state_achievement_access").upsert(payload as any, { onConflict: "state_code,user_id" } as any);
        }
        setMsg("✅ Imported (best effort).");
        await loadAll();
      })();
    } catch {
      setMsg("Invalid JSON.");
    }
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🔐 Owner — Achievements Access</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={() => window.location.assign("/owner/state-achievements")}>Back</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={loadAll}>Refresh</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={copyExport}>Export</button>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={importExport}>Import</button>
          <SupportBundleButton />
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>State</div>
          <input className="zombie-input" value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ padding: "10px 12px", width: 120 }} />
          <div style={{ opacity: 0.75, fontSize: 12 }}>
            {loading ? "Loading…" : `grants=${rows.length}`}
          </div>
        </div>
        {msg ? <div style={{ marginTop: 10 }}>{msg}</div> : null}
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Grant Access</div>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
          Add a user by Supabase Auth User ID. (You can paste from /debug userId.)
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="zombie-input" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="user_id (uuid)" style={{ padding: "10px 12px", minWidth: 320, flex: 1 }} />
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={canView} onChange={(e) => setCanView(e.target.checked)} />
            <span style={{ opacity: 0.85 }}>Can View</span>
          </label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={canEdit} onChange={(e) => setCanEdit(e.target.checked)} />
            <span style={{ opacity: 0.85 }}>Can Edit</span>
          </label>
          <button className="zombie-btn" style={{ padding: "10px 12px" }} onClick={addOrUpdate}>Save</button>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Current Grants</div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <div key={String(r.id || (String(r.user_id) + ":" + String(r.state_code)))} style={{ padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>{String(r.user_id || "(no user_id)")}</div>
                <div style={{ marginLeft: "auto", opacity: 0.85 }}>
                  view={String(!!r.can_view)} • edit={String(!!r.can_edit)}
                </div>
              </div>
              <div style={{ opacity: 0.65, fontSize: 12, marginTop: 6 }}>
                created={String(r.created_at || "—")}
              </div>
              <button className="zombie-btn" style={{ marginTop: 8, padding: "6px 8px", fontSize: 12 }} onClick={() => remove(r)}>
                Remove
              </button>
            </div>
          ))}
          {!loading && rows.length === 0 ? <div style={{ opacity: 0.75 }}>No grants yet.</div> : null}
        </div>
      </div>
    </div>
  );
}