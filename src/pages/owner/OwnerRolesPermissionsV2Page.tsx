import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useIsAppAdmin } from "../../hooks/useIsAppAdmin";

type PermKey = { key: string; label: string; feature: string };
type RoleRow = {
  id: string;
  alliance_code: string;
  role_key: string;
  display_name: string;
  rank: number;
  is_system: boolean;
};

export default function OwnerRolesPermissionsV2Page() {
  const { isAdmin, loading } = useIsAppAdmin();

  const [allianceCode, setAllianceCode] = useState("");
  const [permKeys, setPermKeys] = useState<PermKey[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("");

  const [allowedByKey, setAllowedByKey] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<string, PermKey[]> = {};
    for (const k of permKeys) {
      const f = k.feature || "Other";
      if (!map[f]) map[f] = [];
      map[f].push(k);
    }
    return map;
  }, [permKeys]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("permission_keys_v2")
        .select("key,label,feature")
        .order("feature", { ascending: true })
        .order("key", { ascending: true });

      if (!error && data) setPermKeys(data as any);
    })();
  }, []);

  const loadRoles = async (codeRaw: string) => {
    const c = (codeRaw || "").trim().toUpperCase();
    if (!c) {
      setRoles([]);
      setSelectedRoleKey("");
      setAllowedByKey({});
      return;
    }

    const { data, error } = await supabase
      .from("alliance_roles_v2")
      .select("id,alliance_code,role_key,display_name,rank,is_system")
      .eq("alliance_code", c)
      .order("rank", { ascending: true })
      .order("role_key", { ascending: true });

    if (error) return;

    const rows = (data || []) as any as RoleRow[];
    setRoles(rows);

    if (rows.length > 0) {
      setSelectedRoleKey((prev) => prev || rows[0].role_key);
    } else {
      setSelectedRoleKey("");
      setAllowedByKey({});
    }
  };

  const loadPerms = async (codeRaw: string, roleKeyRaw: string) => {
    const c = (codeRaw || "").trim().toUpperCase();
    const rk = (roleKeyRaw || "").trim();
    if (!c || !rk) {
      setAllowedByKey({});
      return;
    }

    const { data, error } = await supabase
      .from("alliance_role_permissions_v2")
      .select("permission_key,allowed")
      .eq("alliance_code", c)
      .eq("role_key", rk);

    if (error) return;

    const map: Record<string, boolean> = {};
    for (const r of (data || []) as any[]) map[r.permission_key] = !!r.allowed;
    setAllowedByKey(map);
  };

  useEffect(() => {
    loadRoles(allianceCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode]);

  useEffect(() => {
    loadPerms(allianceCode, selectedRoleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allianceCode, selectedRoleKey]);

  const createRole = async () => {
    const c = allianceCode.trim().toUpperCase();
    if (!c) return window.alert("Enter Alliance Code first (e.g. WOC).");

    const role_key = (window.prompt("Role key (e.g. r5, officer, recruiter):") || "").trim();
    if (!role_key) return;

    const display_name = (window.prompt("Display name (e.g. R5, Officer):") || "").trim() || role_key;

    const rankRaw = (window.prompt("Rank (number). Lower = higher priority. Example: 10") || "10").trim();
    const rankParsed = parseInt(rankRaw, 10);
    const rank = Number.isFinite(rankParsed) ? rankParsed : 10;

    setBusy(true);
    try {
      const { error } = await supabase.from("alliance_roles_v2").insert({
        alliance_code: c,
        role_key,
        display_name,
        rank,
        is_system: false,
      });

      if (error) return window.alert(error.message);

      await loadRoles(c);
      setSelectedRoleKey(role_key);
    } finally {
      setBusy(false);
    }
  };

  const deleteRole = async (rk: string) => {
    const c = allianceCode.trim().toUpperCase();
    if (!c) return;

    const ok = window.confirm('Delete role "' + rk + '" for ' + c + "?");
    if (!ok) return;

    setBusy(true);
    try {
      // delete permissions first (safe)
      await supabase
        .from("alliance_role_permissions_v2")
        .delete()
        .eq("alliance_code", c)
        .eq("role_key", rk);

      const { error } = await supabase
        .from("alliance_roles_v2")
        .delete()
        .eq("alliance_code", c)
        .eq("role_key", rk)
        .eq("is_system", false);

      if (error) window.alert(error.message);

      await loadRoles(c);
      setSelectedRoleKey("");
      setAllowedByKey({});
    } finally {
      setBusy(false);
    }
  };

  const togglePerm = async (permKey: string, next: boolean) => {
    const c = allianceCode.trim().toUpperCase();
    const rk = selectedRoleKey;
    if (!c || !rk) return;

    setAllowedByKey((prev) => ({ ...prev, [permKey]: next }));

    const { error } = await supabase
      .from("alliance_role_permissions_v2")
      .upsert(
        { alliance_code: c, role_key: rk, permission_key: permKey, allowed: next } as any,
        { onConflict: "alliance_code,role_key,permission_key" }
      );

    if (error) {
      window.alert(error.message);
      setAllowedByKey((prev) => ({ ...prev, [permKey]: !next }));
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!isAdmin) return <div style={{ padding: 24 }}>Not authorized.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>🛡️ Roles & Permissions (V2)</h2>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        This is the new v2 system. It does not change any existing working features until we wire it in.
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Alliance Code:
          <input
            value={allianceCode}
            onChange={(e) => setAllianceCode(e.target.value.toUpperCase())}
            placeholder="WOC"
            style={{ padding: "8px 10px", borderRadius: 8, minWidth: 120 }}
          />
        </label>

        <button onClick={createRole} disabled={!allianceCode.trim() || busy} style={{ padding: "8px 12px", borderRadius: 10 }}>
          + Add Role
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginTop: 18 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Roles</div>

          {roles.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No roles yet for this alliance.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {roles.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: selectedRoleKey === r.role_key ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.12)",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedRoleKey(r.role_key)}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.display_name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      key: {r.role_key} · rank: {r.rank}
                      {r.is_system ? " · system" : ""}
                    </div>
                  </div>

                  {!r.is_system && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRole(r.role_key);
                      }}
                      disabled={busy}
                      style={{ padding: "6px 10px", borderRadius: 10 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>
            Permissions {selectedRoleKey ? <span style={{ opacity: 0.85 }}>(role: {selectedRoleKey})</span> : null}
          </div>

          {!selectedRoleKey ? (
            <div style={{ opacity: 0.8 }}>Select a role to edit permissions.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Object.keys(grouped).map((feature) => (
                <div key={feature} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>{feature}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                    {grouped[feature].map((k) => {
                      const checked = !!allowedByKey[k.key];
                      return (
                        <label key={k.key} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <input type="checkbox" checked={checked} onChange={(e) => togglePerm(k.key, e.target.checked)} />
                          <div>
                            <div style={{ fontWeight: 700 }}>{k.label}</div>
                            <div style={{ fontSize: 12, opacity: 0.8 }}>{k.key}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
