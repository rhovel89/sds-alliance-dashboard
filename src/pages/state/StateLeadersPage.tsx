import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Row = {
  id: string;
  state_code: string;
  user_id: string;
  leader_role: "Governor" | "State Leadership" | "State Council" | "State Members";
  active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const ROLES: Row["leader_role"][] = ["Governor", "State Leadership", "State Council", "State Members"];

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

function GroupCard(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ fontWeight: 950, fontSize: 16 }}>{props.title}</div>
      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>{props.children}</div>
    </div>
  );
}

export default function StateLeadersPage() {
  const stateCode = "789";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<Row["leader_role"]>("Governor");
  const [newActive, setNewActive] = useState(true);

  async function load() {
    setLoading(true);
    setStatus("");

    const res = await supabase
      .from("state_leaders")
      .select("id,state_code,user_id,leader_role,active,created_by,created_at,updated_at")
      .eq("state_code", stateCode)
      .order("leader_role", { ascending: true })
      .order("created_at", { ascending: false });

    setLoading(false);

    if (res.error) {
      setStatus(res.error.message);
      setRows([]);
      return;
    }

    setRows((res.data ?? []) as any);
  }

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const r of rows) {
      const key = r.leader_role || "State Members";
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    for (const role of ROLES) if (!map[role]) map[role] = [];
    return map;
  }, [rows]);

  async function addLeader() {
    const uid = newUserId.trim();
    if (!uid) return;

    const { data: u } = await supabase.auth.getUser();
    const me = u.user?.id ?? "";
    if (!me) return alert("Please sign in again.");

    setStatus("Adding…");

    const ins = await supabase.from("state_leaders").insert({
      state_code: stateCode,
      user_id: uid,
      leader_role: newRole,
      active: !!newActive,
      created_by: me,
      updated_at: new Date().toISOString(),
    });

    if (ins.error) {
      setStatus(ins.error.message);
      return;
    }

    setNewUserId("");
    setNewRole("Governor");
    setNewActive(true);
    setStatus("Added ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  async function updateRow(id: string, patch: Partial<Row>) {
    setStatus("Saving…");
    const up = await supabase
      .from("state_leaders")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (up.error) {
      setStatus("Save failed: " + up.error.message);
      return;
    }

    setRows((prev) => prev.map((r) => (r.id === id ? ({ ...r, ...patch } as any) : r)));
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 700);
  }

  async function removeRow(r: Row) {
    const ok = confirm("Delete this leader entry?");
    if (!ok) return;

    setStatus("Deleting…");
    const del = await supabase.from("state_leaders").delete().eq("id", r.id);
    if (del.error) {
      setStatus("Delete failed: " + del.error.message);
      return;
    }
    setRows((prev) => prev.filter((x) => x.id !== r.id));
    setStatus("Deleted ✅");
    window.setTimeout(() => setStatus(""), 700);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>State Leaders (State {stateCode})</h2>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
        Manage leadership groups for State {stateCode}. Owner/Admin (or delegated managers) can edit.
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <input
          value={newUserId}
          onChange={(e) => setNewUserId(e.target.value)}
          placeholder="user_id (uuid)"
          style={{ minWidth: 320, width: "min(520px, 100%)" }}
        />

        <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.9 }}>
          <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} />
          Active
        </label>

        <button type="button" onClick={addLeader} disabled={!newUserId.trim()}>
          Add
        </button>

        <button type="button" onClick={() => void load()}>
          Refresh
        </button>

        <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 12 }}>
          {loading ? "Loading…" : status ? status : `${rows.length} total`}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {ROLES.map((role) => (
          <GroupCard key={role} title={role}>
            {grouped[role].map((r) => (
              <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 900 }}>user_id</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => void removeRow(r)}>Delete</button>
                  </div>
                </div>

                <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 13, opacity: 0.95 }}>
                  {r.user_id}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ opacity: 0.85 }}>Role</span>
                    <select
                      value={r.leader_role}
                      onChange={(e) => void updateRow(r.id, { leader_role: e.target.value as any })}
                    >
                      {ROLES.map((rr) => (
                        <option key={rr} value={rr}>{rr}</option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ opacity: 0.85 }}>Active</span>
                    <input
                      type="checkbox"
                      checked={!!r.active}
                      onChange={(e) => void updateRow(r.id, { active: e.target.checked })}
                    />
                  </label>
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 12, flexWrap: "wrap", opacity: 0.85, fontSize: 12 }}>
                  <div><b>Created:</b> {fmt(r.created_at)}</div>
                  <div><b>Updated:</b> {fmt(r.updated_at)}</div>
                  <div><b>Created by:</b> {r.created_by ?? "—"}</div>
                </div>
              </div>
            ))}

            {grouped[role].length === 0 ? <div style={{ opacity: 0.75 }}>None.</div> : null}
          </GroupCard>
        ))}
      </div>
    </div>
  );
}
