import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

import CommandCenterShell from "../../components/commandcenter/CommandCenterShell";
import ActionDrawer from "../../components/commandcenter/ActionDrawer";
import { getCommandCenterModules } from "../../components/commandcenter/ccModules";

type AnyRow = any;

function nowIso() { return new Date().toISOString(); }
function s(v: any) { return v === null || v === undefined ? "" : String(v); }

export default function State789ThreadsPage() {
  const nav = useNavigate();
  const stateCode = "789";

  const cc = useMemo(() => getCommandCenterModules(), []);
  const modules = useMemo(() => cc.map(({ key, label, hint }) => ({ key, label, hint })), [cc]);
  function onSelectModule(k: string) {
    const to = cc.find((m) => m.key === k)?.to;
    if (to) nav(to);
  }

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const [threads, setThreads] = useState<AnyRow[]>([]);
  const [selected, setSelected] = useState<AnyRow | null>(null);
  const [posts, setPosts] = useState<AnyRow[]>([]);

  const [q, setQ] = useState("");

  // new thread drawer
  const [drawer, setDrawer] = useState(false);
  const [scope, setScope] = useState<"state" | "alliance">("state");
  const [allianceCode, setAllianceCode] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  // reply
  const [reply, setReply] = useState("");

  // discord notify
  const [notifyDiscord, setNotifyDiscord] = useState(true);
  const [discordChannels, setDiscordChannels] = useState<any[]>([]);
  const [discordChannelId, setDiscordChannelId] = useState("");

  async function loadThreads() {
    setLoading(true);
    setStatus("");

    // Threads table created with updated_at; keep ordering safe (no pinned sort)
    const r = await supabase
      .from("ops_threads")
      .select("*")
      .eq("state_code", stateCode)
      .order("updated_at", { ascending: false })
      .limit(200);

    setLoading(false);

    if (r.error) { setStatus(r.error.message); return; }
    setThreads((r.data || []) as any[]);
  }

  async function loadPosts(threadId: string) {
    setStatus("");
    const r = await supabase
      .from("ops_thread_posts")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (r.error) { setStatus(r.error.message); return; }
    setPosts((r.data || []) as any[]);
  }

  async function loadDiscordChannels() {
    // schema-safe
    const ch = await supabase
      .from("state_discord_channels")
      .select("*")
      .eq("state_code", stateCode)
      .order("channel_name", { ascending: true });

    if (!ch.error) setDiscordChannels((ch.data || []) as any[]);

    // Try default threads channel if present; otherwise keep existing selection
    const d = await supabase
      .from("state_discord_defaults")
      .select("*")
      .eq("state_code", stateCode)
      .maybeSingle();

    if (!d.error && d.data) {
      const obj: any = d.data || {};
      const v = String(
        obj.threads_channel_id ??
        obj.achievements_export_channel_id ??
        obj.reports_channel_id ??
        obj.alerts_channel_id ??
        ""
      );
      if (v && !discordChannelId) setDiscordChannelId(v);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadThreads();
      if (!cancelled) await loadDiscordChannels();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected?.id) loadPosts(String(selected.id));
    else setPosts([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const visibleThreads = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    if (!term) return threads;
    return (threads || []).filter((t: any) => {
      const blob =
        `${s(t.title)} ${s(t.body)} ${s(t.scope)} ${s(t.alliance_code)} ${JSON.stringify(t.tags || [])}`.toLowerCase();
      return blob.includes(term);
    });
  }, [threads, q]);

  async function createThread() {
    try {
      setStatus("");

      const u = await supabase.auth.getUser();
      const uid = u.data?.user?.id;
      if (!uid) { setStatus("Not signed in."); return; }

      const tagList = String(tags || "").split(",").map(x => x.trim()).filter(Boolean);

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
        const link = `${window.location.origin}/state/${stateCode}/threads#${encodeURIComponent(String(row?.id || ""))}`;
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

      // safe bump (trigger might also handle it)
      await supabase.from("ops_threads").update({ updated_at: nowIso() } as any).eq("id", selected.id);

      setReply("");
      await loadPosts(String(selected.id));
      await loadThreads();

      if (notifyDiscord && discordChannelId) {
        const link = `${window.location.origin}/state/${stateCode}/threads#${encodeURIComponent(String(selected?.id || ""))}`;
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

  async function saveDefaultThreadsChannel() {
    try {
      const cid = String(discordChannelId || "").trim();
      if (!cid) { setStatus("Pick a channel first."); return; }

      const existing = await supabase
        .from("state_discord_defaults")
        .select("*")
        .eq("state_code", stateCode)
        .maybeSingle();

      const obj: any = (!existing.error && existing.data) ? existing.data : {};
      const payload: any = {
        state_code: stateCode,
        threads_channel_id: cid,
      };

      // satisfy NOT NULL alerts_channel_id if present and missing
      if (obj && obj.alerts_channel_id) payload.alerts_channel_id = obj.alerts_channel_id;
      else payload.alerts_channel_id = cid;

      const up = await supabase.from("state_discord_defaults").upsert(payload as any, { onConflict: "state_code" } as any);
      if (up.error) { setStatus(up.error.message); return; }

      setStatus("Default saved ✅");
      window.setTimeout(() => setStatus(""), 900);
    } catch (e: any) {
      setStatus(String(e?.message || e || "Save default failed"));
    }
  }

  return (
    <CommandCenterShell
      title="State 789 — Threads"
      subtitle="Ops comms • Discord notify • schema-safe"
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
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>Search, select, reply. (RLS enforced.)</div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search threads…"
            style={{ marginTop: 10, width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
          />

          {status ? <div style={{ marginTop: 10, fontSize: 12, opacity: 0.9 }}>{status}</div> : null}
          {loading ? <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>Loading…</div> : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {visibleThreads.map((t: any) => (
              <button
                key={String(t.id)}
                type="button"
                className="zombie-btn"
                onClick={() => setSelected(t)}
                style={{ textAlign: "left", whiteSpace: "normal", opacity: selected?.id === t.id ? 1 : 0.85 }}
              >
                <div style={{ fontWeight: 900 }}>{String(t.title || "Thread")}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  {t.scope === "alliance" ? `Alliance: ${String(t.alliance_code || "")}` : `State: ${String(t.state_code || "")}`}
                  {" • "}
                  {t.updated_at ? new Date(String(t.updated_at)).toLocaleString() : ""}
                </div>
              </button>
            ))}
            {!visibleThreads.length ? <div style={{ opacity: 0.7, fontSize: 12 }}>No threads.</div> : null}
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

                  <select
                    value={discordChannelId}
                    onChange={(e) => setDiscordChannelId(e.target.value)}
                    style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)", minWidth: 260 }}
                  >
                    <option value="">Discord Channel (state) — optional</option>
                    {(discordChannels || []).map((c: any) => (
                      <option key={String(c.id || c.channel_id)} value={String(c.channel_id || "")}>
                        {String(c.channel_name || c.channel_id || "")}
                      </option>
                    ))}
                  </select>

                  <button className="zombie-btn" type="button" onClick={saveDefaultThreadsChannel} style={{ whiteSpace: "nowrap" }}>
                    Save as default
                  </button>
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
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as any)}
              style={{ marginLeft: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
            >
              <option value="state">State</option>
              <option value="alliance">Alliance</option>
            </select>
          </label>

          {scope === "alliance" ? (
            <input
              value={allianceCode}
              onChange={(e) => setAllianceCode(e.target.value)}
              placeholder="Alliance code (e.g. WOC)"
              style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
            />
          ) : null}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Body"
            rows={6}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.20)", color: "rgba(255,255,255,0.92)" }}
          />

          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma separated)"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)" }}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <button className="zombie-btn" type="button" onClick={createThread}>Create</button>
            <button className="zombie-btn" type="button" onClick={() => setDrawer(false)}>Cancel</button>
          </div>
        </div>
      </ActionDrawer>
    </CommandCenterShell>
  );
}
