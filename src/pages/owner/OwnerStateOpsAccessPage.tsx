import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type PlayerOpt = { user_id: string; display_name: string; player_id: string };
type GrantRow = { id: string; state_code: string; user_id: string; can_manage: boolean; created_at: string };

export default function OwnerStateOpsAccessPage() {
  const [stateCode, setStateCode] = useState("789");
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [pickUserId, setPickUserId] = useState<string>("");
  const [canManage, setCanManage] = useState(true);
  const [status, setStatus] = useState<string>("");

  const nameByUserId = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of players) m[p.user_id] = p.display_name;
    return m;
  }, [players]);

  async function loadPlayers() {
    const r = await supabase
      .from("v_approved_players")
      .select("user_id,display_name,player_id")
      .order("display_name", { ascending: true });

    if (r.error) { setStatus(r.error.message); return; }
    setPlayers((r.data ?? []) as any);
  }

  async function loadGrants() {
    setStatus("Loading…");
    const r = await supabase
      .from("state_ops_access")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false });

    if (r.error) { setStatus(r.error.message); setGrants([]); return; }
    setGrants((r.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void loadPlayers(); }, []);
  useEffect(() => { void loadGrants(); }, [stateCode]);

  async function upsertGrant() {
    if (!pickUserId) return alert("Pick a player.");
    if (!stateCode.trim()) return alert("State required.");

    setStatus("Saving…");
    const r = await supabase
      .from("state_ops_access")
      .upsert({ state_code: stateCode.trim(), user_id: pickUserId, can_manage: !!canManage }, { onConflict: "state_code,user_id" });

    if (r.error) { setStatus(r.error.message); return; }
    setStatus("Saved ✅");
    await loadGrants();
    window.setTimeout(() => setStatus(""), 900);
  }

  async function toggleGrant(g: GrantRow) {
    setStatus("Updating…");
    const r = await supabase
      .from("state_ops_access")
      .update({ can_manage: !g.can_manage })
      .eq("id", g.id);

    if (r.error) { setStatus(r.error.message); return; }
    setStatus("Updated ✅");
    await loadGrants();
    window.setTimeout(() => setStatus(""), 900);
  }

  async function revoke(g: GrantRow) {
    const ok = confirm("Revoke this user's ops access?");
    if (!ok) return;

    setStatus("Revoking…");
    const r = await supabase.from("state_ops_access").delete().eq("id", g.id);
    if (r.error) { setStatus(r.error.message); return; }

    setStatus("Revoked ✅");
    await loadGrants();
    window.setTimeout(() => setStatus(""), 900);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🗺️ Ops Board Access</h2>
        <SupportBundleButton />
      </div>
      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>{status || "Owner/Admin only: grant who can manage the State Ops Board."}</div>

      <div className="zombie-card" style={{ marginTop: 12, padding: 14, borderRadius: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <label>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>State</div>
            <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} />
          </label>

          <label>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Player</div>
            <select value={pickUserId} onChange={(e) => setPickUserId(e.target.value)}>
              <option value="">Select player…</option>
              {players.map((p) => (
                <option key={p.user_id} value={p.user_id}>{p.display_name}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={canManage} onChange={(e) => setCanManage(e.target.checked)} />
            <span><b>Can manage</b> ops board items</span>
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" onClick={() => void upsertGrant()}>Save Grant</button>
          </div>
        </div>
      </div>

      <div className="zombie-card" style={{ marginTop: 12, padding: 14, borderRadius: 16 }}>
        <div style={{ fontWeight: 950 }}>Current grants (state {stateCode})</div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {grants.map((g) => (
            <div key={g.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>
                  {nameByUserId[g.user_id] || g.user_id}
                  <span style={{ opacity: 0.75, fontSize: 12 }}>  •  {g.can_manage ? "manager" : "view-only"}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => void toggleGrant(g)}>Toggle</button>
                  <button type="button" onClick={() => void revoke(g)}>Revoke</button>
                </div>
              </div>
              <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                Created: {new Date(g.created_at).toLocaleString()}
              </div>
            </div>
          ))}
          {!grants.length ? <div style={{ opacity: 0.8 }}>No grants yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
