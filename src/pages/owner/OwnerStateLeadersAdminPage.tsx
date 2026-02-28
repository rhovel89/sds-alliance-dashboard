import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type RoleRow = any;
type AssignRow = any;
type PlayerOpt = { user_id: string; display_name: string; player_id: string };

export default function OwnerStateLeadersAdminPage() {
  const [stateCode, setStateCode] = useState("789");
  const [tab, setTab] = useState<"roles"|"assign">("assign");

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [assign, setAssign] = useState<AssignRow[]>([]);
  const [players, setPlayers] = useState<PlayerOpt[]>([]);

  const [status, setStatus] = useState("");

  // role editor
  const [roleKey, setRoleKey] = useState("");
  const [roleName, setRoleName] = useState("");
  const [roleRank, setRoleRank] = useState("10");
  const [roleActive, setRoleActive] = useState(true);

  // assignment editor
  const [pickRole, setPickRole] = useState("");
  const [pickUser, setPickUser] = useState("");

  const nameByUser = useMemo(() => {
    const m: Record<string,string> = {};
    for (const p of players) m[p.user_id] = p.display_name;
    return m;
  }, [players]);

  async function loadAll() {
    setStatus("Loading…");

    const p = await supabase.from("v_approved_players").select("user_id,display_name,player_id").order("display_name", { ascending: true });
    if (!p.error) setPlayers((p.data ?? []) as any);

    const r = await supabase.from("state_leader_roles").select("*").eq("state_code", stateCode).order("rank", { ascending: true });
    if (r.error) { setStatus(r.error.message); setRoles([]); return; }
    setRoles(r.data ?? []);

    const a = await supabase.from("state_leader_assignments").select("*").eq("state_code", stateCode).order("created_at", { ascending: false });
    if (a.error) { setStatus(a.error.message); setAssign([]); return; }
    setAssign(a.data ?? []);

    setStatus("");
    if (!pickRole && (r.data ?? []).length) setPickRole(String((r.data as any)[0].role_key));
  }

  useEffect(() => { void loadAll(); }, [stateCode]);

  async function saveRole() {
    const k = roleKey.trim().toLowerCase();
    const n = roleName.trim();
    if (!k || !n) return alert("Role key + display name required.");

    setStatus("Saving role…");
    const up = await supabase.from("state_leader_roles").upsert({
      state_code: stateCode,
      role_key: k,
      display_name: n,
      rank: Number(roleRank || 10),
      active: !!roleActive
    }, { onConflict: "state_code,role_key" });

    if (up.error) { setStatus(up.error.message); return; }
    setRoleKey(""); setRoleName(""); setRoleRank("10"); setRoleActive(true);
    await loadAll();
  }

  async function deleteRole(r: RoleRow) {
    const ok = confirm("Delete this role? (Assignments remain but will not show until role exists again.)");
    if (!ok) return;

    setStatus("Deleting…");
    const d = await supabase.from("state_leader_roles").delete().eq("id", r.id);
    if (d.error) { setStatus(d.error.message); return; }
    await loadAll();
  }

  async function addAssignment() {
    if (!pickRole || !pickUser) return alert("Pick role + player.");

    setStatus("Assigning…");
    const ins = await supabase.from("state_leader_assignments").insert({
      state_code: stateCode,
      role_key: pickRole,
      user_id: pickUser
    });
    if (ins.error) { setStatus(ins.error.message); return; }
    setPickUser("");
    await loadAll();
  }

  async function removeAssignment(a: AssignRow) {
    const ok = confirm("Remove assignment?");
    if (!ok) return;

    setStatus("Removing…");
    const d = await supabase.from("state_leader_assignments").delete().eq("id", a.id);
    if (d.error) { setStatus(d.error.message); return; }
    await loadAll();
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🏛️ State Leaders Admin</h2>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>{status || "Owner/Admin: manage roles + assignments."}</div>

      <div className="zombie-card" style={{ marginTop: 12, padding: 12, borderRadius: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 900 }}>State</span>
            <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 90 }} />
          </label>

          <button type="button" onClick={() => setTab("assign")} disabled={tab==="assign"}>Assignments</button>
          <button type="button" onClick={() => setTab("roles")} disabled={tab==="roles"}>Roles Catalog</button>

          <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
            Public view: <a href={`/state/${stateCode}/leaders`}>/state/{stateCode}/leaders</a>
          </div>
        </div>
      </div>

      {tab === "assign" ? (
        <div className="zombie-card" style={{ marginTop: 12, padding: 12, borderRadius: 16 }}>
          <div style={{ fontWeight: 950 }}>Assign players to roles</div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <select value={pickRole} onChange={(e) => setPickRole(e.target.value)}>
              <option value="">Pick role…</option>
              {roles.map((r) => <option key={r.id} value={r.role_key}>{r.display_name} ({r.role_key})</option>)}
            </select>

            <select value={pickUser} onChange={(e) => setPickUser(e.target.value)}>
              <option value="">Pick player…</option>
              {players.map((p) => <option key={p.user_id} value={p.user_id}>{p.display_name}</option>)}
            </select>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => void addAssignment()}>Add Assignment</button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {assign.map((a) => (
              <div key={a.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>
                    {roles.find(r => r.role_key === a.role_key)?.display_name || a.role_key}
                    <span style={{ opacity: 0.75, fontSize: 12 }}> • {nameByUser[a.user_id] || a.user_id}</span>
                  </div>
                  <button type="button" onClick={() => void removeAssignment(a)}>Remove</button>
                </div>
              </div>
            ))}
            {!assign.length ? <div style={{ opacity: 0.8 }}>No assignments yet.</div> : null}
          </div>
        </div>
      ) : (
        <div className="zombie-card" style={{ marginTop: 12, padding: 12, borderRadius: 16 }}>
          <div style={{ fontWeight: 950 }}>Roles catalog</div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <input value={roleKey} onChange={(e) => setRoleKey(e.target.value)} placeholder="role_key (example: governor)" />
            <input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Display name (example: Governor)" />
            <input value={roleRank} onChange={(e) => setRoleRank(e.target.value)} placeholder="Rank (lower = higher)" />
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={roleActive} onChange={(e) => setRoleActive(e.target.checked)} />
              Active
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => void saveRole()}>Save Role</button>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {roles.map((r) => (
              <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>
                    {r.display_name} <span style={{ opacity: 0.75, fontSize: 12 }}>({r.role_key}) • rank {r.rank} • {r.active ? "active" : "inactive"}</span>
                  </div>
                  <button type="button" onClick={() => void deleteRole(r)}>Delete</button>
                </div>
              </div>
            ))}
            {!roles.length ? <div style={{ opacity: 0.8 }}>No roles.</div> : null}
          </div>
        </div>
      )}
    </div>
  );
}
