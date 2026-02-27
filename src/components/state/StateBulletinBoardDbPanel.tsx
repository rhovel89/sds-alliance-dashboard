import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Row = {
  id: string;
  state_code: string;
  title: string;
  body: string;
  pinned: boolean;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function StateBulletinBoardDbPanel(props: { stateCode: string }) {
  const stateCode = props.stateCode;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [canManage, setCanManage] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>("");

  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setStatus("");

    // Determine manage rights using a safe probe:
    // attempt an insert with rollback-style approach is not possible in PostgREST,
    // so we check by calling the helper function via RPC (best effort).
    try {
      const rpc = await supabase.rpc("can_manage_state_bulletins", { p_state_code: stateCode });
      if (!rpc.error) setCanManage(!!rpc.data);
    } catch {}

    const res = await supabase
      .from("state_bulletins")
      .select("*")
      .eq("state_code", stateCode)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    setLoading(false);

    if (res.error) {
      setStatus(res.error.message);
      setRows([]);
      return;
    }

    // filter out expired (client-side)
    const now = Date.now();
    const out = ((res.data ?? []) as Row[]).filter((r) => {
      if (!r.expires_at) return true;
      const t = Date.parse(r.expires_at);
      return isNaN(t) ? true : t > now;
    });

    setRows(out);
  }

  useEffect(() => { void refresh(); }, [stateCode]);

  async function createOrSave() {
    if (!canManage) return alert("You do not have permission to post bulletins.");

    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;

    const payload: any = {
      state_code: stateCode,
      title: t,
      body: b,
      pinned: !!pinned,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    setStatus(editingId ? "Saving…" : "Posting…");

    if (editingId) {
      const up = await supabase.from("state_bulletins").update(payload).eq("id", editingId);
      if (up.error) { setStatus(up.error.message); return; }
      setStatus("Saved ✅");
    } else {
      const ins = await supabase.from("state_bulletins").insert(payload);
      if (ins.error) { setStatus(ins.error.message); return; }
      setStatus("Posted ✅");
    }

    setTitle("");
    setBody("");
    setPinned(false);
    setExpiresAt("");
    setEditingId(null);

    await refresh();
    window.setTimeout(() => setStatus(""), 900);
  }

  function startEdit(r: Row) {
    setEditingId(r.id);
    setTitle(r.title);
    setBody(r.body);
    setPinned(!!r.pinned);
    setExpiresAt(r.expires_at ? new Date(r.expires_at).toISOString().slice(0, 16) : "");
  }

  async function remove(r: Row) {
    if (!canManage) return alert("You do not have permission to delete bulletins.");
    const ok = confirm("Delete this bulletin?");
    if (!ok) return;

    setStatus("Deleting…");
    const del = await supabase.from("state_bulletins").delete().eq("id", r.id);
    if (del.error) { setStatus(del.error.message); return; }
    setStatus("Deleted ✅");
    await refresh();
    window.setTimeout(() => setStatus(""), 900);
  }

  const header = useMemo(() => `📌 State Bulletin Board (State ${stateCode})`, [stateCode]);

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>{header}</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            {canManage ? "You can post/edit/delete." : "View-only."}
            {status ? " • " + status : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void refresh()}>Refresh</button>
        </div>
      </div>

      {canManage ? (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Message…" />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
              Pinned
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ opacity: 0.85 }}>Expires (optional)</span>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {editingId ? (
                <button type="button" onClick={() => { setEditingId(null); setTitle(""); setBody(""); setPinned(false); setExpiresAt(""); }}>
                  Cancel
                </button>
              ) : null}
              <button type="button" onClick={() => void createOrSave()}>
                {editingId ? "Save" : "Post"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 950 }}>
                {r.pinned ? "📌 " : ""}{r.title}
              </div>
              {canManage ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => startEdit(r)}>Edit</button>
                  <button type="button" onClick={() => void remove(r)}>Delete</button>
                </div>
              ) : null}
            </div>
            <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{r.body}</div>
            <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div><b>Created:</b> {fmt(r.created_at)}</div>
              {r.expires_at ? <div><b>Expires:</b> {fmt(r.expires_at)}</div> : null}
            </div>
          </div>
        ))}
        {!rows.length && !loading ? <div style={{ opacity: 0.8 }}>No bulletins yet.</div> : null}
      </div>
    </div>
  );
}

