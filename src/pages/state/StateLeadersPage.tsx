import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Row = {
  user_id: string;
  created_by: string | null;
  created_at: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function StateLeadersPage() {
  const title = useMemo(() => "State Leaders", []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [newUserId, setNewUserId] = useState("");

  async function load() {
    setLoading(true);
    setStatus("");

    const res = await supabase
      .from("state_leaders")
      .select("user_id,created_by,created_at")
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

  async function addLeader() {
    const uid = newUserId.trim();
    if (!uid) return;

    const { data: u } = await supabase.auth.getUser();
    const me = u.user?.id ?? "";
    if (!me) return alert("Please sign in again.");

    setStatus("Adding…");

    const ins = await supabase.from("state_leaders").insert({
      user_id: uid,
      created_by: me,
    });

    if (ins.error) {
      setStatus(ins.error.message);
      return;
    }

    setNewUserId("");
    setStatus("Added ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  async function removeLeader(r: Row) {
    const ok = confirm("Remove this leader entry?");
    if (!ok) return;

    setStatus("Removing…");

    // Best effort delete: use both keys if possible
    let del = await supabase
      .from("state_leaders")
      .delete()
      .eq("user_id", r.user_id);

    // If created_at exists, scope delete tighter (prevents deleting multiple rows)
    if (r.created_at) {
      del = await supabase
        .from("state_leaders")
        .delete()
        .eq("user_id", r.user_id)
        .eq("created_at", r.created_at);
    }

    if (del.error) {
      setStatus(del.error.message);
      return;
    }

    setStatus("Removed ✅");
    await load();
    window.setTimeout(() => setStatus(""), 900);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
        Note: This table currently stores only <b>user_id</b> entries. No “title/role” column exists yet.
        Use <code>/owner/permissions-matrix-v3</code> for role-style permissions.
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={newUserId}
          onChange={(e) => setNewUserId(e.target.value)}
          placeholder="Add leader by user_id (uuid)"
          style={{ minWidth: 320, width: "min(520px, 100%)" }}
        />
        <button onClick={addLeader} type="button" disabled={!newUserId.trim()}>
          Add
        </button>
        <button onClick={() => void load()} type="button">
          Refresh
        </button>

        <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 12 }}>
          {loading ? "Loading…" : status ? status : `${rows.length} rows`}
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={`${r.user_id}-${r.created_at ?? ""}`} className="zombie-card" style={{ padding: 12, borderRadius: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>Leader user_id</div>
              <button type="button" onClick={() => void removeLeader(r)}>
                Remove
              </button>
            </div>

            <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 13, opacity: 0.95 }}>
              {r.user_id}
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", opacity: 0.85, fontSize: 12 }}>
              <div><b>Created:</b> {fmt(r.created_at)}</div>
              <div><b>Created by:</b> {r.created_by ?? "—"}</div>
            </div>
          </div>
        ))}

        {rows.length === 0 && !loading ? (
          <div style={{ opacity: 0.8 }}>No leaders yet.</div>
        ) : null}
      </div>
    </div>
  );
}
