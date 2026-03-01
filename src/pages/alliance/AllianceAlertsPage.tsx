import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseBrowserClient";
import DiscordChannelSelect from "../../components/discord/DiscordChannelSelect";

type Severity = "info" | "warning" | "critical";

type Row = {
  id: string;
  alliance_id: string;
  created_at: string;
  created_by_user_id: string;
  created_by_name?: string | null;
  severity: Severity;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  is_acked: boolean;
};

function normalizeTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export default function AllianceAlertsPage() {
  const { alliance_id } = useParams();
  const allianceCode = useMemo(() => String(alliance_id || "").toUpperCase().trim(), [alliance_id]);

  const { alliance_id } = useParams();
  const allianceId = alliance_id ?? "";

  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  // create form
  const [severity, setSeverity] = useState<Severity>("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [discordChannelId, setDiscordChannelId] = useState<string>("");
  const [tagsRaw, setTagsRaw] = useState("");

  // filters
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
    if (!allianceId) return;
    setStatus("Loading…");
    const res = await supabase
      .from("v_my_alliance_alerts")
      .select("*")
      .eq("alliance_id", allianceId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (res.error) {
      setStatus(res.error.message);
      return;
    }
    setRows((res.data ?? []) as any);
    setStatus("");
  }

  useEffect(() => { void load(); }, [allianceId]);

  async function postAlert() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return alert("Title and body are required.");

    setStatus("Posting…");
    const ins = await supabase.from("alliance_alerts").insert({
      alliance_id: allianceId,
      created_by_user_id: userId,
      severity,
      title: t,
      body: b,
      tags: normalizeTags(tagsRaw),
      pinned: false,
    });

    if (ins.error) {
      setStatus(ins.error.message);
      return;
    }
    setTitle("");
    setBody("");
    setTagsRaw("");
    await load();
    setStatus("Posted ✅");
    window.setTimeout(() => setStatus(""), 1200);
  }

  async function toggleAck(r: Row) {
    if (!userId) return;
    setStatus("Saving…");
    if (r.is_acked) {
      const del = await supabase.from("alliance_alert_acks").delete().eq("alert_id", r.id).eq("user_id", userId);
      if (del.error) { setStatus(del.error.message); return; }
    } else {
      const ins = await supabase.from("alliance_alert_acks").insert({ alert_id: r.id, user_id: userId });
      if (ins.error) { setStatus(ins.error.message); return; }
    }
    await load();
    setStatus("");
  }

  async function togglePinned(r: Row) {
    setStatus("Saving…");
    const up = await supabase.from("alliance_alerts").update({ pinned: !r.pinned }).eq("id", r.id);
    if (up.error) { setStatus(up.error.message); return; }
    await load();
    setStatus("");
  }

  async function removeAlert(r: Row) {
    const ok = confirm("Delete this alert?");
    if (!ok) return;
    setStatus("Deleting…");
    const del = await supabase.from("alliance_alerts").delete().eq("id", r.id);
    if (del.error) { setStatus(del.error.message); return; }
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

    const createAndSend = async () => {
    const t = String(title || "").trim();
    const b = String(body || "").trim();
    if (!t) return;

    try {
      await postAlert();

      const msg =
        ("🚨 **" + String(allianceCode || "").toUpperCase() + " Alert**\n") +
        ("**" + t.slice(0, 180) + "**") +
        (b ? ("\n" + b.slice(0, 1500)) : "") +
        ("\nView: https://state789.site/dashboard/" + encodeURIComponent(String(allianceCode || "").toUpperCase()));

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: "789",
        p_alliance_code: String(allianceCode || "").toUpperCase(),
        p_kind: "alerts",
        p_channel_id: discordChannelId || "",
        p_message: msg,
      } as any);

      if (q.error) throw q.error;
      alert("Queued to Discord ✅");
    } catch (e) {
      console.error(e);
      alert("Post+Send failed (DB/RLS/queue).");
    }
  };
return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Alliance Alerts</h1>
      <div style={{ opacity: 0.8, marginTop: 6 }}>
        Alliance: <code>{allianceId}</code> {status ? " • " + status : ""}
      </div>

      <div style={{ border: "1px solid #333", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        <div style={{ padding: 12, borderBottom: "1px solid #333", fontWeight: 900 }}>Post Alert (delegated)</div>
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ opacity: 0.8 }}>Severity</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              <option value="info">info</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Discord channel</div>
            <DiscordChannelSelect
              scope="alliance"
              kind="alerts"
              stateCode="789"
              allianceCode={String(allianceCode || "").toUpperCase()}
              value={discordChannelId}
              onChange={setDiscordChannelId}
            />
          </div><button onClick={postAlert} disabled={!userId}>Post</button>
          <button
            type="button"
            onClick={createAndSend}
            style={{ padding: "10px 12px", borderRadius: 10, marginLeft: 8 }}
          >
            Post + Send to Discord
          </button>
            <span style={{ opacity: 0.7, fontSize: 12 }}>
              If Post fails, you need alliance permission can_post_alerts (or owner/admin).
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
          <input type="checkbox" checked={onlyPinned} onChange={(e) => setOnlyPinned(e.target.checked)} />
          pinned only
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={onlyUnacked} onChange={(e) => setOnlyUnacked(e.target.checked)} />
          unacked only
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
                <div style={{ fontWeight: 900 }}>
                  {r.pinned ? "📌 " : ""}[{r.severity.toUpperCase()}] {r.title}
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {new Date(r.created_at).toLocaleString()} • {r.created_by_name ?? r.created_by_user_id.slice(0, 8) + "…"}
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

