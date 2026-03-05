import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import ActionDrawer from "../../components/commandcenter/ActionDrawer";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

type ThreadRow = any;
type PostRow = any;

function nowIso() { return new Date().toISOString(); }

export default function State789ThreadsPage() {
  const nav = useNavigate();
  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);

  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const stateCode = "789";

  const [status, setStatus] = useState("");
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selected, setSelected] = useState<ThreadRow | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);

  const [drawer, setDrawer] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [scope, setScope] = useState<"state" | "alliance">("state");
  const [allianceCode, setAllianceCode] = useState("");

  const [notifyDiscord, setNotifyDiscord] = useState(true);
  const [discordChannelId, setDiscordChannelId] = useState("");

  const [reply, setReply] = useState("");

  async function loadThreads() {
    setStatus("");
    const r = await supabase
      .from("ops_threads")
      .select("*")
      .eq("state_code", stateCode)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (r.error) { setStatus(r.error.message); return; }
    setThreads((r.data || []) as any[]);
  }

  async function loadPosts(threadId: string) {
    const r = await supabase
      .from("ops_thread_posts")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (r.error) { setStatus(r.error.message); return; }
    setPosts((r.data || []) as any[]);
  }

  useEffect(() => { loadThreads(); }, []);

  useEffect(() => {
    if (selected?.id) loadPosts(String(selected.id));
    else setPosts([]);
  }, [selected?.id]);

  async function createThread() {
    try {
      setStatus("");

      const u = await supabase.auth.getUser();
      const uid = u.data?.user?.id;
      if (!uid) { setStatus("Not signed in."); return; }

      const tagList = tags.split(",").map(s => s.trim()).filter(Boolean);
      const payload: any = {
        scope,
        state_code: stateCode,
        alliance_code: scope === "alliance" ? String(allianceCode || "").trim().toUpperCase() : null,
        title: String(title || "").trim(),
        body: String(body || "").trim(),
        tags: tagList,
        created_by: uid,
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      if (!payload.title || !payload.body) { setStatus("Title and body required."); return; }
      if (scope === "alliance" && !payload.alliance_code) { setStatus("Alliance code required for alliance threads."); return; }

      const ins = await supabase.from("ops_threads").insert(payload).select("*").maybeSingle();
      if (ins.error) { setStatus(ins.error.message); return; }

      const row = ins.data as any;
      setDrawer(false);
      setTitle(""); setBody(""); setTags(""); setAllianceCode("");
      await loadThreads();
      setSelected(row);

      if (notifyDiscord && discordChannelId) {
        const link = `${window.location.origin}/state/789/threads#${encodeURIComponent(String(row?.id || ""))}`;
        const msg =
          `🩸 **State ${stateCode} — New Thread**\n` +
          `**${payload.title}**\n` +
          `${payload.body}\n` +
          (payload.alliance_code ? `Alliance: **${payload.alliance_code}**\n` : "") +
          `Link: ${link}`;

        await supabase.rpc("queue_discord_send", {
          p_kind: "ops_thread",
          p_target: "channel",
          p_channel_id: String(discordChannelId),
          p_content: msg,
          p_meta: { state_code: stateCode, thread_id: row?.id, scope: payload.scope, alliance_code: payload.alliance_code }
        } as any);
      }
    } catch (e: any) {
      setStatus(String(e?.message || e || "Create failed"));
    }
  }

  async function postReply() {
    try {
      if (!selected?.id) return;
      const txt = String(reply || "").trim();
      if (!txt) return;

      const u = await supabase.auth.getUser();
      const uid = u.data?.user?.id;
      if (!uid) { setStatus("Not signed in."); return; }

      const ins = await supabase.from("ops_thread_posts").insert({
        thread_id: selected.id,
        body: txt,
        created_by: uid,
        created_at: nowIso(),
      }).select("*").maybeSingle();

      if (ins.error) { setStatus(ins.error.message); return; }

      await supabase.from("ops_threads").update({ updated_at: nowIso() } as any).eq("id", selected.id);
      setReply("");
      await loadPosts(String(selected.id));
      await loadThreads();

      if (notifyDiscord && discordChannelId) {
        const link = `${window.location.origin}/state/789/threads#${encodeURIComponent(String(selected?.id || ""))}`;
        const msg =
          `🧟 **Thread Reply**\n` +
          `**${String(selected?.title || "")}**\n` +
          `${txt}\n` +
          `Link: ${link}`;

        await supabase.rpc("queue_discord_send", {
          p_kind: "ops_thread_reply",
          p_target: "channel",
          p_channel_id: String(discordChannelId),
          p_content: msg,
          p_meta: { state_code: stateCode, thread_id: selected?.id }
        } as any);
      }
    } catch (e: any) {
      setStatus(String(e?.message || e || "Reply failed"));
    }
  }

  return (
    <CommandCenterShell
      title="State 789 — Threads"
      subtitle="In-app threads • Discord notify • no duplicated flows"
      modules={modules}
      activeModuleKey="threads"
      onSelectModule={onSelectModule}
      topRight={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="zombie-btn" type="button" onClick={() => setDrawer(true)}>+ New Thread</button>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 12, alignItems: "start" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          <div style={{ fontWeight: 950, fontSize: 14 }}>Threads</div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>State threads require staff access. Alliance threads require membership.</div>

          {status ? <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>{status}</div> : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {threads.map((t: any) => (
              <button
                key={String(t.id)}
                type="button"
                className="zombie-btn"
                onClick={() => setSelected(t)}
                style={{
                  textAlign: "left",
                  whiteSpace: "normal",
                  opacity: selected?.id === t.id ? 1 : 0.85,
                }}
              >
                <div style={{ fontWeight: 900 }}>{String(t.title || "Thread")}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  {t.scope === "alliance" ? `Alliance: ${String(t.alliance_code || "")}` : `State: ${String(t.state_code || "")}`}
                  {" • "}
                  {t.updated_at ? new Date(String(t.updated_at)).toLocaleString() : ""}
                </div>
              </button>
            ))}
            {!threads.length ? <div style={{ opacity: 0.7, fontSize: 12 }}>No threads yet.</div> : null}
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12 }}>
          {!selected ? (
            <div style={{ opacity: 0.7 }}>Select a thread.</div>
          ) : (
            <>
              <div style={{ fontWeight: 950, fontSize: 16 }}>{String(selected.title || "")}</div>
              <div style={{ opacity: 0.75, fontSize: 12, marginTop: 6 }}>
                {selected.scope === "alliance" ? `Alliance: ${String(selected.alliance_code || "")}` : `State: ${String(selected.state_code || "")}`}
              </div>
              <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{String(selected.body || "")}</div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.10)", marginTop: 12, paddingTop: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", opacity: 0.9 }}>Replies</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                  {posts.map((p: any) => (
                    <div key={String(p.id)} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.18)", borderRadius: 12, padding: 10 }}>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{p.created_at ? new Date(String(p.created_at)).toLocaleString() : ""}</div>
                      <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{String(p.body || "")}</div>
                    </div>
                  ))}
                  {!posts.length ? <div style={{ opacity: 0.7, fontSize: 12 }}>No replies yet.</div> : null}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ fontSize: 12, opacity: 0.85 }}>
                    <input type="checkbox" checked={notifyDiscord} onChange={(e) => setNotifyDiscord(e.target.checked)} /> Notify Discord
                  </label>
                  <input
                    value={discordChannelId}
                    onChange={(e) => setDiscordChannelId(e.target.value)}
                    placeholder="Discord Channel ID (optional)"
                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)", minWidth: 240 }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply…"
                    rows={4}
                    style={{ flex: 1, padding: 10, borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)", color: "rgba(255,255,255,0.92)" }}
                  />
                  <button className="zombie-btn" type="button" onClick={postReply} style={{ whiteSpace: "nowrap" }}>
                    Post
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ActionDrawer open={drawer} title="New Thread" onClose={() => setDrawer(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>
            Scope
            <select value={scope} onChange={(e) => setScope(e.target.value as any)}
              style={{ marginLeft: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}>
              <option value="state">State</option>
              <option value="alliance">Alliance</option>
            </select>
          </label>

          {scope === "alliance" ? (
            <input value={allianceCode} onChange={(e) => setAllianceCode(e.target.value)} placeholder="Alliance code (e.g. WOC)"
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }} />
          ) : null}

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }} />

          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" rows={6}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)", color: "rgba(255,255,255,0.92)" }} />

          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontSize: 12, opacity: 0.85 }}>
              <input type="checkbox" checked={notifyDiscord} onChange={(e) => setNotifyDiscord(e.target.checked)} /> Notify Discord
            </label>
            <input value={discordChannelId} onChange={(e) => setDiscordChannelId(e.target.value)} placeholder="Discord Channel ID (optional)"
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)", minWidth: 240 }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="zombie-btn" type="button" onClick={createThread}>Create</button>
            <button className="zombie-btn" type="button" onClick={() => setDrawer(false)}>Cancel</button>
          </div>
        </div>
      </ActionDrawer>
    </CommandCenterShell>
  );
}
