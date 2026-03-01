import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseBrowserClient";
import DiscordChannelSelect from "../../components/discord/DiscordChannelSelect";
import StateDiscordChannelSelect from "../../components/discord/StateDiscordChannelSelect";
import StateDiscordChannelsManagerPanel from "../../components/state/StateDiscordChannelsManagerPanel";

type Severity = "info" | "warning" | "critical";

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
  return raw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20);
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
  const [autoSend, setAutoSend] = useState<boolean>(true);
  const [tagsRaw, setTagsRaw] = useState("");

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

    if (res.error) { setStatus(res.error.message); return; }
    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, []);

  async function postAlert() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return alert("Title and body required.");
    setStatus("Posting…");

    const ins = await supabase.from("state_alerts").insert({
      state_code: stateCode,
      created_by_user_id: userId,
      severity,
      title: t,
      body: b,
      tags: tagsFrom(tagsRaw),
      pinned: false,
    });

    if (ins.error) { setStatus(ins.error.message); return; }
    setTitle(""); setBody(""); setTagsRaw("");
    await load();
    setStatus("Posted ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function toggleAck(r: Row) {
    if (!userId) return;
    setStatus("Saving…");
    if (r.is_acked) {
      const del = await supabase.from("state_alert_acks").delete().eq("alert_id", r.id).eq("user_id", userId);
      if (del.error) { setStatus(del.error.message); return; }
    } else {
      const ins = await supabase.from("state_alert_acks").insert({ alert_id: r.id, user_id: userId });
      if (ins.error) { setStatus(ins.error.message); return; }
    }
    await load();
    setStatus("");
  }

  async function togglePinned(r: Row) {
    setStatus("Saving…");
    const up = await supabase.from("state_alerts").update({ pinned: !r.pinned }).eq("id", r.id);
    if (up.error) { setStatus(up.error.message); return; }
    await load();
    setStatus("");
  }

  async function removeAlert(r: Row) {
    const ok = confirm("Delete this alert?");
    if (!ok) return;
    setStatus("Deleting…");
    const del = await supabase.from("state_alerts").delete().eq("id", r.id);
    if (del.error) { setStatus(del.error.message); return; }
    await load();
    setStatus("");
  }

  const filtered = useMemo(() => rows.filter((r) => {
    if (filterSeverity && r.severity !== filterSeverity) return false;
    if (onlyPinned && !r.pinned) return false;
    if (onlyUnacked && r.is_acked) return false;
    return true;
  }), [rows, filterSeverity, onlyPinned, onlyUnacked]);

    const createAndSend = async () => {
    try {
      await postAlert();

      const t = String(title || "").trim();
      const b = String(body || "").trim();

      if (!t) return;

      const msg =
        "🚨 **State Alert**\n" +
        ("**" + t.slice(0, 180) + "**") +
        (b ? ("\n" + b.slice(0, 1500)) : "") +
        "\nView: https://state789.site/state/789/alerts-db";

              if (autoSend) {
      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: "789",
        p_alliance_code: "",
        p_kind: "alerts",
        p_channel_id: discordChannelId || "",
        p_message: msg,
      } as any);

      if (q.error) throw q.error;
              }
      alert("Queued to Discord ✅");
    } catch (e) {
      console.error(e);
      alert("Post+Send failed (DB/RLS/Discord queue).");
    }
  };
  const queueSendExistingStateAlert = async (r: any) => {
    try {
      const t = String(r?.title ?? "").trim();
      const b = String(r?.body ?? "").trim();
      if (!t && !b) return;

      const msg =
        ("🚨 **State Alert**\n") +
        (t ? ("**" + t.slice(0, 180) + "**") : "") +
        (b ? ("\n" + b.slice(0, 1600)) : "");

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: "789",
        p_alliance_code: "",
        p_kind: "state_alert_existing",
        p_channel_id: String((discordChannelId || "") || ""),
        p_message: msg,
      } as any);

      if (q.error) throw q.error;
      alert("Queued to Discord ✅");
    } catch (e: any) {
      console.error(e);
      alert("Queue failed: " + (e?.message || e));
    }
  };
return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>State 789 Alerts (DB)</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>{status ? status : "Supabase-backed alerts"}</div>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Post Alert</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ opacity: 0.8 }}>Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Discord channel</div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input type="checkbox" checked={autoSend} onChange={(e) => setAutoSend(e.target.checked)} />
            Auto-send to Discord
          </label>
          <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 10 }}>
            Tip: leave Channel blank to use the default Discord channel.
          </div>
            <DiscordChannelSelect
              scope="state"
              kind="alerts"
              stateCode="789"
              value={discordChannelId}
              onChange={setDiscordChannelId}
            />
            <StateDiscordChannelSelect
              stateCode="789"
              value={discordChannelId}
              onChange={setDiscordChannelId}
              label="Send to Discord channel"
            />
          </div><button onClick={postAlert} disabled={!userId}>Post</button>
          <button
            type="button"
            onClick={async () => {
              const t = title.trim();
              if (!t) return;

              setStatus("Posting+Sending…");
              try {
                await create(); // keep your existing DB insert logic

                const b = body.trim();
                const msg =
                  ("🚨 **State Alert (789)**\n") +
                  ("**" + t.slice(0, 180) + "**") +
                  (b ? ("\n" + b.slice(0, 1500)) : "") +
                  ("\nView: https://state789.site/state/789/alerts-db");

                const q = await supabase.rpc("queue_discord_send" as any, {
                  p_state_code: "789",
                  p_alliance_code: "",
                  p_kind: "state_alerts",
                  p_channel_id: String(discordChannelId || "").trim(),
                  p_message: msg,
                } as any);

                if (q.error) throw q.error;

                setStatus("Posted+queued ✅");
                window.setTimeout(() => setStatus(""), 900);
              } catch (e) {
                console.error(e);
                setStatus("Post+Send failed");
                alert("Post+Send failed (DB/RLS/queue).");
              }
            }}
            style={{ padding: "10px 12px", borderRadius: 10, marginLeft: 8 }}
          >
            Post + Send to Discord
          </button>
            <span style={{ opacity: 0.7, fontSize: 12 }}>
              Posting requires owner/admin or state grant can_manage_state_alerts.
            </span>
          </div>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title…" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Body…" />
          <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="Tags (comma-separated)..." />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <span style={{ opacity: 0.75 }}>Filters:</span>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as any)}>
          <option value="">(any severity)</option>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
        </select>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={onlyPinned} onChange={(e) => setOnlyPinned(e.target.checked)} /> pinned only
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={onlyUnacked} onChange={(e) => setOnlyUnacked(e.target.checked)} /> unacked only
        </label>
        <button onClick={load}>Reload</button>
        <div style={{ opacity: 0.75 }}>Showing {filtered.length}</div>
      </div>

      <hr style={{ margin: "16px 0", opacity: 0.3 }} />

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((r) => (
          <div key={r.id} style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900 }}>{r.pinned ? "📌 " : ""}[{r.severity.toUpperCase()}] {r.title}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleString()} • {r.created_by_name ?? "Unknown"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => toggleAck(r)}>{r.is_acked ? "Unack" : "Ack"}</button>
                <button onClick={() => togglePinned(r)}>{r.pinned ? "Unpin" : "Pin"}</button>
                <button onClick={() => removeAlert(r)}>Delete</button>
              </div>
            </div>
            <div style={{ padding: 12, whiteSpace: "pre-wrap" }}>{r.body}</div>
          </div>
        ))}
        {filtered.length === 0 ? <div style={{ opacity: 0.75 }}>No alerts.</div> : null}
      </div>
    </div>
  );
}


