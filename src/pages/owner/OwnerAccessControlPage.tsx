import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Alliance = { code?: string; tag?: string; name?: string };
type MemberRow = { player_id: string; role?: string; game_name?: string; name?: string };
type RoleDef = { role_key: string; display_name?: string };
type PermKey = { key: string; label?: string; feature?: string; category?: string };

const FALLBACK_ROLES: RoleDef[] = [
  { role_key: "owner", display_name: "Owner" },
  { role_key: "r5", display_name: "R5" },
  { role_key: "r4", display_name: "R4" },
  { role_key: "member", display_name: "Member" },
  { role_key: "viewer", display_name: "Viewer" },
  { role_key: "state_leader", display_name: "State Leader" },
];

function norm(s?: string | null) { return String(s ?? "").trim(); }
function upper(s?: string | null) { return norm(s).toUpperCase(); }

async function trySelect<T>(fn: () => Promise<{ data: T | null; error: any }>) {
  const res = await fn();
  if (!res.error && res.data) return res.data;
  return null;
}

export default function OwnerAccessControlPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [allianceCode, setAllianceCode] = useState<string>("");

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [roleDefs, setRoleDefs] = useState<RoleDef[]>(FALLBACK_ROLES);

  const [permKeys, setPermKeys] = useState<PermKey[]>([]);
  const [roleKey, setRoleKey] = useState<string>("owner");
  const [enabledPermKeys, setEnabledPermKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const canEditPermissions = useMemo(() => true, []);

  const allianceLabel = (a: Alliance) => {
    const code = norm(a.code) || norm(a.tag);
    const name = norm(a.name);
    if (name && code) return `${name} (${code})`;
    return name || code || "Alliance";
  };

  const loadAlliances = async () => {
    let data: any[] | null = null;

    data = await trySelect<any[]>(() => supabase.from("alliances").select("code,name").order("name", { ascending: true }));
    if (!data) data = await trySelect<any[]>(() => supabase.from("alliances").select("tag,name").order("name", { ascending: true }));
    if (!data) data = await trySelect<any[]>(() => supabase.from("alliances").select("code,tag,name"));
    if (!data) data = await trySelect<any[]>(() => supabase.from("alliances").select("*").limit(200));

    setAlliances(data ?? []);
    const firstCode = norm(data?.[0]?.code) || norm(data?.[0]?.tag) || "";
    if (!allianceCode && firstCode) setAllianceCode(upper(firstCode));
  };

  const loadMembers = async (code: string) => {
    if (!code) { setMembers([]); return; }

    const joined = await trySelect<any[]>(() =>
      supabase
        .from("player_alliances")
        .select("player_id, role, players(id, game_name, name)")
        .eq("alliance_code", upper(code))
        .order("role", { ascending: true })
    );

    if (joined) {
      const rows: MemberRow[] = joined.map((r: any) => ({
        player_id: r.player_id,
        role: r.role,
        game_name: r.players?.game_name,
        name: r.players?.name,
      }));
      setMembers(rows);
      return;
    }

    const pa = await trySelect<any[]>(() =>
      supabase
        .from("player_alliances")
        .select("player_id, role")
        .eq("alliance_code", upper(code))
        .order("role", { ascending: true })
    );

    const base: MemberRow[] = (pa ?? []).map((r: any) => ({ player_id: r.player_id, role: r.role }));
    setMembers(base);

    const ids = Array.from(new Set(base.map((x) => x.player_id).filter(Boolean)));
    if (ids.length === 0) return;

    const players = await trySelect<any[]>(() => supabase.from("players").select("id, game_name, name").in("id", ids));
    if (!players) return;

    const byId = new Map<string, any>();
    for (const p of players) byId.set(p.id, p);

    setMembers(base.map((m) => {
      const p = byId.get(m.player_id);
      return { ...m, game_name: p?.game_name, name: p?.name };
    }));
  };

  const loadRoleDefs = async (code: string) => {
    if (!code) { setRoleDefs(FALLBACK_ROLES); return; }

    let rows: any[] | null = null;
    rows = await trySelect<any[]>(() =>
      supabase.from("alliance_roles").select("role_key, display_name").eq("alliance_code", upper(code)).order("display_name", { ascending: true })
    );
    if (!rows) rows = await trySelect<any[]>(() =>
      supabase.from("alliance_roles").select("role_key, name").eq("alliance_code", upper(code)).order("name", { ascending: true })
    );

    if (!rows) { setRoleDefs(FALLBACK_ROLES); return; }

    const defs: RoleDef[] = rows
      .map((r: any) => ({ role_key: String(r.role_key ?? "").toLowerCase(), display_name: r.display_name ?? r.name ?? r.role_key }))
      .filter((r: any) => r.role_key);

    const map = new Map<string, RoleDef>();
    for (const r of FALLBACK_ROLES) map.set(r.role_key, r);
    for (const r of defs) map.set(r.role_key, r);

    setRoleDefs(Array.from(map.values()));
  };

  const loadPermissionKeys = async () => {
    const rows = await trySelect<any[]>(() => supabase.from("permission_keys").select("*").limit(500));
    const normed: PermKey[] = (rows ?? [])
      .map((r: any) => ({
        key: String(r.key ?? r.permission_key ?? r.id ?? ""),
        label: r.label ?? r.name ?? r.key,
        feature: r.feature,
        category: r.category,
      }))
      .filter((x) => x.key);

    normed.sort((a, b) => a.key.localeCompare(b.key));
    setPermKeys(normed);
  };

  const loadRolePermissions = async (code: string, rk: string) => {
    if (!code || !rk) { setEnabledPermKeys(new Set()); return; }

    let rows: any[] | null = null;
    rows = await trySelect<any[]>(() =>
      supabase.from("alliance_role_permissions").select("*").eq("alliance_code", upper(code)).eq("role_key", rk)
    );
    if (!rows) rows = await trySelect<any[]>(() =>
      supabase.from("alliance_role_permissions").select("*").eq("alliance_code", upper(code)).eq("role_key", rk)
    );
    if (!rows) rows = await trySelect<any[]>(() =>
      supabase.from("alliance_role_permissions").select("*").eq("alliance_code", upper(code)).eq("role_key", rk).limit(500)
    );

    const s = new Set<string>();
    for (const r of (rows ?? [])) {
      const k = r.permission_key ?? r.key ?? r.permission ?? r.perm_key;
      if (k) s.add(String(k));
    }
    setEnabledPermKeys(s);
  };

  const updateMemberRole = async (playerId: string, newRole: string) => {
    if (!allianceCode || !playerId) return;
    setSaving(true);
    setErr(null);
    try {
      const { error } = await supabase
        .from("player_alliances")
        .update({ role: newRole })
        .eq("alliance_code", upper(allianceCode))
        .eq("player_id", playerId);

      if (error) throw error;

      setMembers((prev) => prev.map((m) => m.player_id === playerId ? { ...m, role: newRole } : m));
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = async (permKey: string) => {
    if (!canEditPermissions) return;
    if (!allianceCode || !roleKey || !permKey) return;

    const isOn = enabledPermKeys.has(permKey);
    setSaving(true);
    setErr(null);

    try {
      if (isOn) {
        let del = await supabase
          .from("alliance_role_permissions")
          .delete()
          .eq("alliance_code", upper(allianceCode))
          .eq("role_key", roleKey)
          .eq("permission_key", permKey);

        if (del.error) {
          del = await supabase
            .from("alliance_role_permissions")
            .delete()
            .eq("alliance_code", upper(allianceCode))
            .eq("role_key", roleKey)
            .eq("key", permKey);
        }

        if (del.error) throw del.error;

        setEnabledPermKeys((prev) => {
          const n = new Set(prev);
          n.delete(permKey);
          return n;
        });
      } else {
        let ins = await supabase
          .from("alliance_role_permissions")
          .insert({ alliance_code: upper(allianceCode), role_key: roleKey, permission_key: permKey });

        if (ins.error) {
          ins = await supabase
            .from("alliance_role_permissions")
            .insert({ alliance_code: upper(allianceCode), role_key: roleKey, key: permKey });
        }

        if (ins.error) throw ins.error;

        setEnabledPermKeys((prev) => new Set(prev).add(permKey));
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        await loadAlliances();
        await loadPermissionKeys();
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      if (!allianceCode) return;
      await loadMembers(allianceCode);
      await loadRoleDefs(allianceCode);
      await loadRolePermissions(allianceCode, roleKey);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  useEffect(() => {
    (async () => {
      if (!allianceCode || !roleKey) return;
      await loadRolePermissions(allianceCode, roleKey);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleKey]);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>🛡️ Owner: Roles & Permissions</h2>

      {err && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 8 }}>
          <b>Error:</b> {err}
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Alliance:</span>
          <select value={allianceCode} onChange={(e) => setAllianceCode(upper(e.target.value))}>
            {alliances.map((a, i) => {
              const code = upper(a.code) || upper(a.tag) || "";
              return (
                <option key={i} value={code}>
                  {allianceLabel(a)}
                </option>
              );
            })}
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span>Role:</span>
          <select value={roleKey} onChange={(e) => setRoleKey(String(e.target.value).toLowerCase())}>
            {roleDefs.map((r) => (
              <option key={r.role_key} value={r.role_key}>
                {r.display_name ?? r.role_key}
              </option>
            ))}
          </select>
        </label>

        {saving && <span style={{ opacity: 0.8 }}>Saving…</span>}
      </div>

      <hr style={{ margin: "18px 0", opacity: 0.25 }} />

      <h3>Members & Roles</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Player</th>
              <th style={{ padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Role</th>
              <th style={{ padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const label = m.game_name || m.name || m.player_id;
              const current = String(m.role ?? "member").toLowerCase();
              return (
                <tr key={m.player_id}>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{label}</td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <select
                      value={current}
                      onChange={(e) => {
                        const v = String(e.target.value).toLowerCase();
                        setMembers((prev) => prev.map((x) => x.player_id === m.player_id ? { ...x, role: v } : x));
                      }}
                    >
                      {roleDefs.map((r) => (
                        <option key={r.role_key} value={r.role_key}>
                          {r.display_name ?? r.role_key}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "8px 6px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <button
                      onClick={() => updateMemberRole(m.player_id, String(m.role ?? "member").toLowerCase())}
                      disabled={saving}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 10, opacity: 0.8 }}>
                  No members found (or RLS prevented reading).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <hr style={{ margin: "18px 0", opacity: 0.25 }} />

      <h3>Permissions for Role: {roleKey}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
        {permKeys.map((p) => {
          const on = enabledPermKeys.has(p.key);
          const title = p.label ? `${p.label} (${p.key})` : p.key;
          const group = p.category || p.feature || "";
          return (
            <label
              key={p.key}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: 10,
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
              }}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => togglePermission(p.key)}
                disabled={saving || !canEditPermissions}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span>{title}</span>
                {group && <span style={{ fontSize: 12, opacity: 0.75 }}>{group}</span>}
              </div>
            </label>
          );
        })}
        {permKeys.length === 0 && (
          <div style={{ opacity: 0.8 }}>
            No permission keys found.
          </div>
        )}
      </div>
    </div>
  );
}
