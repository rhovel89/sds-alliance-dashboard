import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function AllianceDefaultReminderChannelPanel() {
  const { alliance_id } = useParams();
  const allianceCode = useMemo(() => String(alliance_id || "").toUpperCase(), [alliance_id]);

  const [canManage, setCanManage] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [status, setStatus] = useState<string>("");

  async function load() {
    if (!allianceCode) return;

    setStatus("");
    try {
      const cm = await supabase.rpc("can_manage_alliance_discord_settings", { p_alliance_code: allianceCode });
      if (!cm.error) setCanManage(!!cm.data);
    } catch {}

    const r = await supabase
      .from("alliance_discord_defaults")
      .select("reminder_channel_id,reminder_channel_name")
      .eq("alliance_code", allianceCode)
      .maybeSingle();

    if (r.error) { setStatus(r.error.message); return; }

    setChannelId(String(r.data?.reminder_channel_id || ""));
    setChannelName(String(r.data?.reminder_channel_name || ""));
  }

  useEffect(() => { void load(); }, [allianceCode]);

  async function save() {
    const id = channelId.trim();
    if (!id) return alert("Paste a Discord channel ID first.");
    if (!/^\d{10,25}$/.test(id)) return alert("That doesn’t look like a Discord channel ID (numbers only).");

    setStatus("Saving…");
    const r = await supabase
      .from("alliance_discord_defaults")
      .upsert({
        alliance_code: allianceCode,
        reminder_channel_id: id,
        reminder_channel_name: channelName.trim() || null,
      });

    if (r.error) { setStatus(r.error.message); alert(r.error.message); return; }
    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
    await load();
  }

  async function clear() {
    const ok = confirm("Clear the default reminder channel for this alliance?");
    if (!ok) return;

    setStatus("Clearing…");
    const r = await supabase.from("alliance_discord_defaults").delete().eq("alliance_code", allianceCode);
    if (r.error) { setStatus(r.error.message); alert(r.error.message); return; }

    setChannelId("");
    setChannelName("");
    setStatus("Cleared ✅");
    window.setTimeout(() => setStatus(""), 900);
  }

  return (
    <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>🔔 Default Reminder Channel</div>
        <div style={{ opacity: 0.8, fontSize: 12 }}>{status}</div>
      </div>

      <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
        Used when an event has <b>Send Reminders</b> enabled but no channel is chosen. (Owner/Admin + R5/R4 can edit)
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Channel ID</span>
          <input value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="1477..." style={{ width: 220 }} />
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Name (optional)</span>
          <input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="#reminders" style={{ width: 180 }} />
        </label>

        {canManage ? (
          <>
            <button type="button" onClick={() => void save()}>Save</button>
            <button type="button" onClick={() => void clear()}>Clear</button>
          </>
        ) : (
          <div style={{ opacity: 0.75, fontSize: 12 }}>View-only</div>
        )}
      </div>

      {channelId ? (
        <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
          Current default: <code>{channelId}</code>{channelName ? <span> • {channelName}</span> : null}
        </div>
      ) : (
        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
          No default set yet.
        </div>
      )}
    </div>
  );
}
