import StateScheduledAlertControls from "../../components/state/StateScheduledAlertControls";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";
import StateDiscordChannelSelect from "../../components/discord/StateDiscordChannelSelect";
import StateDiscordChannelsManagerPanel from "../../components/state/StateDiscordChannelsManagerPanel";

type Severity = "info" | "warning" | "critical";
type MentionTarget = "none" | "everyone" | "here" | "leadership" | "custom";

type Row = {
  id: string;
  state_code: string;
  created_at: string;
  severity: Severity;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  is_acked: boolean;
  created_by_name?: string | null;
};

function tagsFrom(raw: string) {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function mentionText(target: MentionTarget, custom: string) {
  if (target === "everyone") return "@everyone";
  if (target === "here") return "@here";
  if (target === "leadership") return "@leadership";
  if (target === "custom") return String(custom || "").trim();
  return "";
}

function buildDiscordMessage(params: {
  stateCode: string;
  title: string;
  body: string;
  mention: string;
}) {
  const lines = [
    params.mention ? params.mention : "",
    "🚨 **State Alert (" + params.stateCode + ")**",
    "**" + params.title.slice(0, 180) + "**",
    params.body ? params.body.slice(0, 1500) : "",
    "View: https://state789.site/state/" + encodeURIComponent(params.stateCode) + "/alerts-db",
  ].filter(Boolean);

  return lines.join("\n");
}

export default function State789AlertsDbPage() {
  const stateCode = "789";
  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  const [severity, setSeverity] = useState<Severity>("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [discordChannelId, setDiscordChannelId] = useState<string>("");
  const [tagsRaw, setTagsRaw] = useState("");

  const [mentionTarget, setMentionTarget] = useState<MentionTarget>("none");
  const [mentionOverride, setMentionOverride] = useState("");

  const [onlyPinned, setOnlyPinned] = useState(false);
  const [onlyUnacked, setOnlyUnacked] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<"" | Severity>("");

  useEffect(() => {
    (async () => {
      const u = await supabase.auth.getUser();
      setUserId(u.data.user?.id ?? "");
    })();
  }, []);

  async function load() {
    setStatus("Loading…");
    const res = await supabase
      .from("v_my_state_alerts")
      .select("*")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false })
      .limit(200);

    if (res.error) {
      setStatus(res.error.message);
      return;
    }

    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => {
    void load();
  }, []);

  async function insertAlertRecord(currentTitle: string, currentBody: string) {
    const ins = await supabase.from("state_alerts").insert({
      state_code: stateCode,
      created_by_user_id: userId,
      severity,
      title: currentTitle,
      body: currentBody,
      tags: tagsFrom(tagsRaw),
      pinned: false,
    });

    return ins;
  }

  async function postAlertOnly() {
    const t = title.trim();
    const b = body.trim();

    if (!userId) return alert("Please sign in.");
    if (!t || !b) return alert("Title and body required.");

    setStatus("Saving alert…");

    const ins = await insertAlertRecord(t, b);
    if (ins.error) {
      setStatus(ins.error.message);
      return;
    }

    setTitle("");
    setBody("");
    setTagsRaw("");
    setMentionTarget("none");
    setMentionOverride("");

    await load();
    setStatus("Saved to State Alerts ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function postAndSendNow() {
    const t = title.trim();
    const b = body.trim();

    if (!userId) return alert("Please sign in.");
    if (!t || !b) return alert("Title and body required.");

    setStatus("Posting + sending…");

    try {
      const ins = await insertAlertRecord(t, b);
      if (ins.error) throw ins.error;

      const msg = buildDiscordMessage({
        stateCode,
        title: t,
        body: b,
        mention: mentionText(mentionTarget, mentionOverride),
      });

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: stateCode,
        p_alliance_code: "",
        p_kind: "state_alerts",
        p_channel_id: String(discordChannelId || "").trim(),
        p_message: msg,
      } as any);

      if (q.error) throw q.error;

      setTitle("");
      setBody("");
      setTagsRaw("");
      setMentionTarget("none");
      setMentionOverride("");

      await load();
      setStatus("Posted + queued to Discord ✅");
      window.setTimeout(() => setStatus(""), 1200);
    } catch (e: any) {
      console.error(e);
      setStatus(String(e?.message || e || "Post + Send failed"));
      alert("Post + Send failed.");
    }
  }

  async function queueSendExistingStateAlert(r: Row) {
    try {
      const t = String(r?.title ?? "").trim();
      const b = String(r?.body ?? "").trim();
      if (!t && !b) return;

      setStatus("Queueing existing alert…");

      const msg = buildDiscordMessage({
        stateCode,
        title: t || "State Alert",
        body: b,
        mention: "",
      });

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: stateCode,
        p_alliance_code: "",
        p_kind: "state_alerts",
        p_channel_id: String(discordChannelId || "").trim(),
        p_message: msg,
      } as any);

      if (q.error) throw q.error;

      setStatus("Queued existing alert to Discord ✅");
      window.setTimeout(() => setStatus(""), 1200);
    } catch (e: any) {
      console.error(e);
      setStatus("Queue failed");
      alert("Queue failed: " + (e?.message || e));
    }
  }

  async function toggleAck(r: Row) {
    if (!userId) return;

    setStatus("Saving…");
    if (r.is_acked) {
      const del = await supabase
        .from("state_alert_acks")
        .delete()
        .eq("alert_id", r.id)
        .eq("user_id", userId);
      if (del.error) {
        setStatus(del.error.message);
        return;
      }
    } else {
      const ins = await supabase
        .from("state_alert_acks")
        .insert({ alert_id: r.id, user_id: userId });
      if (ins.error) {
        setStatus(ins.error.message);
        return;
      }
    }

    await load();
    setStatus("");
  }

  async function togglePinned(r: Row) {
    setStatus("Saving…");
    const up = await supabase
      .from("state_alerts")
      .update({ pinned: !r.pinned })
      .eq("id", r.id);

    if (up.error) {
      setStatus(up.error.message);
      return;
    }

    await load();
    setStatus("");
  }

  async function removeAlert(r: Row) {
    const ok = confirm("Delete this alert?");
    if (!ok) return;

    setStatus("Deleting…");
    const del = await supabase.from("state_alerts").delete().eq("id", r.id);
    if (del.error) {
      setStatus(del.error.message);
      return;
    }

    await load();
    setStatus("");
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterSeverity && r.severity !== filterSeverity) return false;
      if (onlyPinned && !r.pinned) return false;
      if (onlyUnacked && r.is_acked) return false;
      return true;
    });
  }, [rows, filterSeverity, onlyPinned, onlyUnacked]);

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1680,
        width: "min(1680px, calc(100vw - 24px))",
        margin: "0 auto",
      }}
    >
      <div
        className="zombie-card"
        style={{
          padding: 18,
          borderRadius: 18,
          background:
            "radial-gradient(circle at top left, rgba(110,0,0,0.22), rgba(0,0,0,0.18) 45%, rgba(0,0,0,0.36) 100%)",
          border: "1px solid rgba(255,120,120,0.14)",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: 0.3 }}>
          ☣️ State 789 Alert Command Center
        </div>
        <div style={{ opacity: 0.82, marginTop: 6 }}>
          Broadcast live alerts, schedule future drops, and control Discord delivery from one screen.
          {status ? " • " + status : ""}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.7fr) minmax(320px, 0.95fr)",
          gap: 16,
          alignItems: "start",
          marginTop: 16,
        }}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <div
            className="zombie-card"
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900 }}>🚨 Compose State Alert</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
              Save it to the State Alerts feed, or post and push it to Discord right now.
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginTop: 14,
              }}
            >
              <div>
                <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Severity</div>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as Severity)}
                  style={{ width: "100%" }}
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Discord channel</div>
                <StateDiscordChannelSelect
                  stateCode={stateCode}
                  value={discordChannelId}
                  onChange={setDiscordChannelId}
                  label="Send to Discord channel"
                />
              </div>

              <div>
                <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Mention target</div>
                <select
                  value={mentionTarget}
                  onChange={(e) => setMentionTarget(e.target.value as MentionTarget)}
                  style={{ width: "100%" }}
                >
                  <option value="none">No mention</option>
                  <option value="everyone">@everyone</option>
                  <option value="here">@here</option>
                  <option value="leadership">@leadership</option>
                  <option value="custom">Custom mention</option>
                </select>
              </div>

              {mentionTarget === "custom" ? (
                <div>
                  <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Custom mention</div>
                  <input
                    value={mentionOverride}
                    onChange={(e) => setMentionOverride(e.target.value)}
                    placeholder='Example: <@&123456789012345678>'
                    style={{ width: "100%" }}
                  />
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Title</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Alert title…"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Body</div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Write the alert body…"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 6 }}>Tags</div>
              <input
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="Tags (comma-separated)…"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => void postAlertOnly()}
                disabled={!userId || !title.trim() || !body.trim()}
                style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}
              >
                Save alert only
              </button>

              <button
                type="button"
                onClick={() => void postAndSendNow()}
                disabled={!userId || !title.trim() || !body.trim()}
                style={{ padding: "10px 14px", borderRadius: 12, fontWeight: 900 }}
              >
                Post + Send now
              </button>

              <span style={{ opacity: 0.72, fontSize: 12 }}>
                Tip: “Save alert only” writes to State Alerts. “Post + Send now” also queues Discord.
              </span>
            </div>

            <StateScheduledAlertControls
              stateCode={stateCode}
              userId={userId}
              title={title}
              body={body}
              discordChannelId={discordChannelId}
              initialSeverity={severity}
            />
          </div>

          <div
            className="zombie-card"
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ opacity: 0.75 }}>Filters:</span>

              <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as any)}>
                <option value="">(any severity)</option>
                <option value="info">info</option>
                <option value="warning">warning</option>
                <option value="critical">critical</option>
              </select>

              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={onlyPinned}
                  onChange={(e) => setOnlyPinned(e.target.checked)}
                />
                pinned only
              </label>

              <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={onlyUnacked}
                  onChange={(e) => setOnlyUnacked(e.target.checked)}
                />
                unacked only
              </label>

              <button type="button" onClick={() => void load()}>
                Reload
              </button>

              <div style={{ opacity: 0.75 }}>Showing {filtered.length}</div>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {filtered.map((r) => (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.025)",
                  }}
                >
                  <div
                    style={{
                      padding: 12,
                      borderBottom: "1px solid rgba(255,255,255,0.10)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {r.pinned ? "📌 " : ""}[{r.severity.toUpperCase()}] {r.title}
                      </div>
                      <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
                        {new Date(r.created_at).toLocaleString()} • {r.created_by_name ?? "Unknown"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => void toggleAck(r)}>
                        {r.is_acked ? "Unack" : "Ack"}
                      </button>
                      <button type="button" onClick={() => void togglePinned(r)}>
                        {r.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button type="button" onClick={() => void queueSendExistingStateAlert(r)}>
                        Send to Discord
                      </button>
                      <button type="button" onClick={() => void removeAlert(r)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: 12, whiteSpace: "pre-wrap" }}>{r.body}</div>

                  {Array.isArray(r.tags) && r.tags.length ? (
                    <div style={{ padding: "0 12px 12px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {r.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.12)",
                            opacity: 0.85,
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              {filtered.length === 0 ? (
                <div style={{ opacity: 0.75 }}>No alerts match the current filter.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div
            className="zombie-card"
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16 }}>📡 Discord Routing</div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 4 }}>
              Pick the active channel for this page or manage state Discord channels below.
            </div>

            <div style={{ marginTop: 12 }}>
              <StateDiscordChannelSelect
                stateCode={stateCode}
                value={discordChannelId}
                onChange={setDiscordChannelId}
                label="Active Discord channel"
              />
            </div>

            <div style={{ marginTop: 12, opacity: 0.75, fontSize: 12 }}>
              Mentions supported here now: @everyone, @here, @leadership, or a custom role mention.
            </div>
          </div>

          <div
            className="zombie-card"
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>🧟 Channel Manager</div>
            <StateDiscordChannelsManagerPanel />
          </div>
        </div>
      </div>
    </div>
  );
}