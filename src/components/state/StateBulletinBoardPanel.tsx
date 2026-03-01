import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRealtimeRefresh } from "../../hooks/useRealtimeRefresh";
import DiscordChannelSelect from "../discord/DiscordChannelSelect";

type Row = {
  id: string;
  state_code: string;
  title: string | null;
  body: string;
  pinned: boolean;
  deleted: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function inferStateCode(): string {
  try {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("state");
    if (i >= 0 && parts[i + 1] && /^[0-9]+$/.test(parts[i + 1])) return parts[i + 1];
  } catch {}
  return "789";
}

export default function StateBulletinBoardPanel(props: { stateCode?: string }) {
  const stateCode = (props.stateCode || inferStateCode() || "789").toString();
  useRealtimeRefresh({
    channel: `rt_bulletin_${stateCode}`,
    enabled: !!stateCode,
    changes: [
      { table: "state_bulletins", filter: `state_code=eq.${stateCode}` },
      { table: "state_bulletin_items", filter: `state_code=eq.${stateCode}` },
      { table: "state_bulletin_posts", filter: `state_code=eq.${stateCode}` },
    ],
    onChange: () => { try { void load(); } catch {} },
    debounceMs: 350,
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [canPost, setCanPost] = useState(false);
  const [canManage, setCanManage] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [discordChannelId, setDiscordChannelId] = useState<string>("");
  const [pin, setPin] = useState(false);

  const titleHint = useMemo(() => `State ${stateCode} Bulletin Board`, [stateCode]);

  async function loadPerms() {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? "";
    if (!uid) { setCanPost(false); setCanManage(false); return; }

    // Owner/admin fast-path (RPC created earlier in your app)
    const flags = await supabase.rpc("my_owner_flags");
    const isOwner = !!(flags.data?.[0]?.is_dashboard_owner);
    const isAdmin = !!(flags.data?.[0]?.is_app_admin);

    if (isOwner || isAdmin) {
      setCanPost(true);
      setCanManage(true);
      return;
    }

    // State grants (RLS allows users to read their own row)
    const g = await supabase
      .from("state_access_grants")
      .select("state_bulletin_post,state_bulletin_manage")
      .eq("state_code", stateCode)
      .eq("user_id", uid)
      .maybeSingle();

    setCanPost(!!g.data?.state_bulletin_post);
    setCanManage(!!g.data?.state_bulletin_manage);
  }

  async function loadRows() {
    setLoading(true);
    setStatus("");
    const res = await supabase
      .from("state_bulletins")
      .select("*")
      .eq("state_code", stateCode)
      .eq("deleted", false)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    setLoading(false);
    if (res.error) { setStatus(res.error.message); setRows([]); return; }
    setRows((res.data ?? []) as any);
  }

  useEffect(() => {
    void loadPerms();
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateCode]);

  async function post() {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? "";
    if (!uid) return alert("Please sign in.");
    if (!canPost) return alert("You do not have permission to post bulletins.");

    const b = body.trim();
    if (!b) return;

    setStatus("Posting…");

    const ins = await supabase.from("state_bulletins").insert({
      state_code: stateCode,
      title: title.trim() || null,
      body: b,
      pinned: canManage ? !!pin : false,
      created_by: uid,
    });

    if (ins.error) { setStatus(ins.error.message); return; }

    setTitle("");
    setBody("");
    setPin(false);
    setStatus("Posted ✅");
    await loadRows();
    window.setTimeout(() => setStatus(""), 900);
  }

  async function togglePin(r: Row) {
    if (!canManage) return;
    setStatus("Updating…");
    const up = await supabase
      .from("state_bulletins")
      .update({ pinned: !r.pinned, updated_at: new Date().toISOString() })
      .eq("id", r.id);

    if (up.error) { setStatus(up.error.message); return; }
    await loadRows();
    setStatus("");
  }

  async function remove(r: Row) {
    if (!canManage) return;
    const ok = confirm("Delete this bulletin?");
    if (!ok) return;

    setStatus("Deleting…");
    const up = await supabase
      .from("state_bulletins")
      .update({ deleted: true, updated_at: new Date().toISOString() })
      .eq("id", r.id);

    if (up.error) { setStatus(up.error.message); return; }
    await loadRows();
    setStatus("");
  }

    async function postAndSend() {
    const u = await supabase.auth.getUser();
    const uid = u.data.user?.id ?? "";
    if (!uid) return alert("Please sign in.");
    if (!canPost) return alert("You do not have permission to post bulletins.");

    const b = body.trim();
    if (!b) return;

    // insert bulletin (same as post())
    const ins = await supabase.from("state_bulletins").insert({
      state_code: stateCode,
      title: title.trim() || null,
      body: b,
      pinned: canManage ? !!pin : false,
      created_by: uid,
    });

    if (ins.error) { setStatus(ins.error.message); return; }

    // queue discord send (state announcements)
    const t = (title.trim() || "Update");
    const msg =
      "📣 **State Bulletin**\n" +
      ("**" + t.slice(0, 180) + "**") +
      (b ? ("\n" + b.slice(0, 1500)) : "") +
      ("\nView: https://state789.site/state/" + encodeURIComponent(stateCode));

    const q = await supabase.rpc("queue_state_discord_send" as any, {
      p_state_code: stateCode,
      p_kind: "announcements",
      p_channel_id: discordChannelId || "",
      p_message: msg,
    } as any);

    if (q.error) { setStatus(String(q.error.message || q.error)); return; }

    setTitle("");
    setBody("");
    setPin(false);
    setStatus("Posted + queued to Discord ✅");
    await loadRows();
    window.setTimeout(() => setStatus(""), 1200);
  }
return (
    <div style={{ border: "1px solid rgba(255,255,255,0.16)", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>{titleHint}</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            {loading ? "Loading…" : "Latest updates & announcements"}{status ? " • " + status : ""}
          </div>
        </div>
        <button onClick={() => void loadRows()}>Refresh</button>
      </div>

      {canPost ? (
        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a bulletin…" rows={4} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            {canManage ? (
              <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.9 }}>
                <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} />
                Pin
              </label>
            ) : <span />}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Discord channel</div>
              <DiscordChannelSelect
                scope="state"
                kind="announcements"
                stateCode={stateCode}
                value={discordChannelId}
                onChange={setDiscordChannelId}
              />
            </div>
            <button onClick={post} disabled={!body.trim()}>Post</button>
            <button onClick={postAndSend} disabled={!body.trim()}>Post + Send to Discord</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12, opacity: 0.8 }}>
          Posting is restricted to Owner/Admin and delegated staff.
        </div>
      )}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 800 }}>
                {r.pinned ? "📌 " : ""}{r.title ? r.title : "Bulletin"}
              </div>
              <div style={{ opacity: 0.7, fontSize: 12 }}>
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{r.body}</div>

            {canManage ? (
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button onClick={() => void togglePin(r)}>{r.pinned ? "Unpin" : "Pin"}</button>
                <button onClick={() => void remove(r)}>Delete</button>
              </div>
            ) : null}
          </div>
        ))}
        {rows.length === 0 ? <div style={{ opacity: 0.75 }}>No bulletins yet.</div> : null}
      </div>
    </div>
  );
}



