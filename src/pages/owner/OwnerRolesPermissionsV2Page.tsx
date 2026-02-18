import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import PermissionLibraryHelper from "../../components/owner/PermissionLibraryHelper";

type RoleRow = {
  id: string;
  key: string;
  label: string;
  scope: string;
  description: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type PermRow = {
  id: string;
  key: string;
  description: string | null;
  created_at?: string | null;
};

type RolePermRow = {
  role_id: string;
  permission_id: string;
};

function norm(v: any) {
  return String(v ?? "").trim();
}

function upper(v: any) {
  return norm(v).toUpperCase();
}

const SCOPES = ["alliance", "state", "app"] as const;

export default function OwnerRolesPermissionsV2Page() {
  const [tab, setTab] = useState<"roles" | "perms" | "matrix">("roles");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [rp, setRp] = useState<RolePermRow[]>([]);

  const rpSet = useMemo(() => {
    const s = new Set<string>();
    for (const x of rp) s.add(`${x.role_id}:${x.permission_id}`);
    return s;
  }, [rp]);

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    setHint(null);

    try {
      const r1 = await supabase
        .from("app_roles")
        .select("id,key,label,scope,description,created_at,updated_at")
        .order("scope", { ascending: true })
        .order("key", { ascending: true });

      if (r1.error) throw r1.error;

      const p1 = await supabase
        .from("app_permissions")
        .select("id,key,description,created_at")
        .order("key", { ascending: true });

      if (p1.error) throw p1.error;

      const rp1 = await supabase
        .from("app_role_permissions")
        .select("role_id,permission_id");

      if (rp1.error) throw rp1.error;

      setRoles((r1.data ?? []) as any);
      setPerms((p1.data ?? []) as any);
      setRp((rp1.data ?? []) as any);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toast = (m: string) => {
    setHint(m);
    setTimeout(() => setHint(null), 1400);
  };

  const addRole = () => {
    const tmp: RoleRow = {
      id: crypto.randomUUID(),
      key: "",
      label: "",
      scope: "alliance",
      description: null,
      created_at: null,
      updated_at: null,
    };
    setRoles((prev) => [tmp, ...prev]);
    toast("Role draft added");
  };

  const saveRole = async (r: RoleRow) => {
    setErr(null);
    try {
      const payload: any = {
        id: r.id,
        key: norm(r.key),
        label: norm(r.label),
        scope: norm(r.scope) || "alliance",
        description: r.description ?? null,
        updated_at: new Date().toISOString(),
      };

      if (!payload.key || !payload.label) {
        throw new Error("Role key + label are required.");
      }

      const res = await supabase
        .from("app_roles")
        .upsert(payload)
        .select("id,key,label,scope,description,created_at,updated_at")
        .maybeSingle();

      if (res.error) throw res.error;

      if (res.data) {
        setRoles((prev) => prev.map((x) => (x.id === r.id ? (res.data as any) : x)));
      }

      toast("Role saved ✅");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const deleteRole = async (r: RoleRow) => {
    if (!window.confirm(`Delete role "${r.key}"? This also removes its permission mappings.`)) return;

    setErr(null);
    try {
      const res = await supabase.from("app_roles").delete().eq("id", r.id);
      if (res.error) throw res.error;

      setRoles((prev) => prev.filter((x) => x.id !== r.id));
      setRp((prev) => prev.filter((x) => x.role_id !== r.id));
      toast("Role deleted ✅");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const addPerm = () => {
    const tmp: PermRow = {
      id: crypto.randomUUID(),
      key: "",
      description: null,
      created_at: null,
    };
    setPerms((prev) => [tmp, ...prev]);
    toast("Permission draft added");
  };

  const savePerm = async (p: PermRow) => {
    setErr(null);
    try {
      const payload: any = {
        id: p.id,
        key: norm(p.key),
        description: p.description ?? null,
      };

      if (!payload.key) throw new Error("Permission key is required.");

      const res = await supabase
        .from("app_permissions")
        .upsert(payload)
        .select("id,key,description,created_at")
        .maybeSingle();

      if (res.error) throw res.error;

      if (res.data) {
        setPerms((prev) => prev.map((x) => (x.id === p.id ? (res.data as any) : x)));
      }

      toast("Permission saved ✅");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const deletePerm = async (p: PermRow) => {
    if (!window.confirm(`Delete permission "${p.key}"?`)) return;

    setErr(null);
    try {
      const res = await supabase.from("app_permissions").delete().eq("id", p.id);
      if (res.error) throw res.error;

      setPerms((prev) => prev.filter((x) => x.id !== p.id));
      setRp((prev) => prev.filter((x) => x.permission_id !== p.id));
      toast("Permission deleted ✅");
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  const toggleRolePerm = async (roleId: string, permId: string) => {
    const key = `${roleId}:${permId}`;
    const exists = rpSet.has(key);

    setErr(null);
    try {
      if (exists) {
        const del = await supabase
          .from("app_role_permissions")
          .delete()
          .eq("role_id", roleId)
          .eq("permission_id", permId);

        if (del.error) throw del.error;

        setRp((prev) => prev.filter((x) => !(x.role_id === roleId && x.permission_id === permId)));
      } else {
        const ins = await supabase
          .from("app_role_permissions")
          .insert({ role_id: roleId, permission_id: permId } as any);

        if (ins.error) throw ins.error;

        setRp((prev) => [...prev, { role_id: roleId, permission_id: permId }]);
      }
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <PermissionLibraryHelper />

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>🛡️ Roles & Permissions</h2>
          <div style={{ opacity: 0.75, fontSize: 12 }}>/owner/roles</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setTab("roles")} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: tab === "roles" ? 900 : 600 }}>
            Roles
          </button>
          <button onClick={() => setTab("perms")} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: tab === "perms" ? 900 : 600 }}>
            Permissions
          </button>
          <button onClick={() => setTab("matrix")} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: tab === "matrix" ? 900 : 600 }}>
            Matrix
          </button>
          <button onClick={refresh} style={{ padding: "8px 10px", borderRadius: 10 }}>
            Refresh
          </button>
        </div>
      </div>

      {hint ? (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(0,255,120,0.25)", borderRadius: 10, opacity: 0.95 }}>
          {hint}
        </div>
      ) : null}

      {err ? (
        <div style={{ marginTop: 10, padding: 10, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
          <div style={{ marginTop: 6, opacity: 0.8, fontSize: 12 }}>
            If this says a table doesn’t exist, run: <code>supabase db push</code> (migration was just added).
          </div>
        </div>
      ) : null}

      {tab === "roles" ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900 }}>Roles</div>
            <button onClick={addRole} style={{ padding: "8px 10px", borderRadius: 10 }}>
              + Add Role
            </button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            {roles.map((r) => (
              <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8, fontSize: 12 }}>Key (unique)</span>
                    <input value={r.key} onChange={(e) => setRoles((prev) => prev.map((x) => (x.id === r.id ? { ...x, key: e.target.value } : x)))} />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8, fontSize: 12 }}>Label</span>
                    <input value={r.label} onChange={(e) => setRoles((prev) => prev.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))} />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8, fontSize: 12 }}>Scope</span>
                    <select value={r.scope} onChange={(e) => setRoles((prev) => prev.map((x) => (x.id === r.id ? { ...x, scope: e.target.value } : x)))}>
                      {SCOPES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8, fontSize: 12 }}>Description</span>
                    <input
                      value={r.description ?? ""}
                      onChange={(e) => setRoles((prev) => prev.map((x) => (x.id === r.id ? { ...x, description: e.target.value || null } : x)))}
                    />
                  </label>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => saveRole(r)} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 900 }}>
                    Save
                  </button>
                  <button onClick={() => deleteRole(r)} style={{ padding: "8px 10px", borderRadius: 10 }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "perms" ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900 }}>Permissions</div>
            <button onClick={addPerm} style={{ padding: "8px 10px", borderRadius: 10 }}>
              + Add Permission
            </button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            {perms.map((p) => (
              <div key={p.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8, fontSize: 12 }}>Key (unique)</span>
                    <input value={p.key} onChange={(e) => setPerms((prev) => prev.map((x) => (x.id === p.id ? { ...x, key: e.target.value } : x)))} />
                  </label>

                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ opacity: 0.8, fontSize: 12 }}>Description</span>
                    <input
                      value={p.description ?? ""}
                      onChange={(e) => setPerms((prev) => prev.map((x) => (x.id === p.id ? { ...x, description: e.target.value || null } : x)))}
                    />
                  </label>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => savePerm(p)} style={{ padding: "8px 10px", borderRadius: 10, fontWeight: 900 }}>
                    Save
                  </button>
                  <button onClick={() => deletePerm(p)} style={{ padding: "8px 10px", borderRadius: 10 }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "matrix" ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 900 }}>Role ↔ Permission Matrix</div>
          <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
            Toggle checkboxes to grant/revoke permissions from roles.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            {roles.map((r) => (
              <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 900 }}>
                  {upper(r.key)} <span style={{ opacity: 0.7, fontWeight: 600 }}>({r.label})</span>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
                  {perms.map((p) => {
                    const k = `${r.id}:${p.id}`;
                    const checked = rpSet.has(k);
                    return (
                      <label key={p.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRolePerm(r.id, p.id)}
                        />
                        <div>
                          <div style={{ fontWeight: 800 }}>{p.key}</div>
                          {p.description ? <div style={{ opacity: 0.75, fontSize: 12 }}>{p.description}</div> : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Note: This page creates/edits roles & permissions. Wiring them into live access checks can be done next (without breaking existing role gates).
          </div>
        </div>
      ) : null}
    </div>
  );
}

