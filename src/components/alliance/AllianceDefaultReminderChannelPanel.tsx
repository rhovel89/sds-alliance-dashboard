import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

function isId(s: string) { return /^\d{10,25}$/.test(String(s || "").trim()); }

export default function AllianceDefaultReminderChannelPanel() {
  const { alliance_id } = useParams();
  const allianceCode = useMemo(() => String(alliance_id || "").toUpperCase(), [alliance_id]);

  const [canManage, setCanManage] = useState(false);
  const [status, setStatus] = useState("");

  const [reminderChannelId, setReminderChannelId] = useState("");
  const [alertsChannelId, setAlertsChannelId] = useState("");
  const [announcementsChannelId, setAnnouncementsChannelId] = useState("");

  async function load() {
    if (!allianceCode) return;
    setStatus("");

    try {
      const cm = await supabase.rpc("can_manage_alliance_discord_settings", { p_alliance_code: allianceCode });
      if (!cm.error) setCanManage(!!cm.data);
    } catch {}

    const r = await supabase
      .from("alliance_discord_defaults")
      .select("reminder_channel_id,alerts_channel_id,announcements_channel_id")
      .eq("alliance_code", allianceCode)
      .maybeSingle();

    if (r.error) { setStatus(r.error.message); return; }

    setReminderChannelId(String(r.data?.reminder_channel_id || ""));
    setAlertsChannelId(String(r.data?.alerts_channel_id || ""));
    setAnnouncementsChannelId(String(r.data?.announcements_channel_id || ""));
  }

  useEffect(() => { void load(); }, [allianceCode]);

  async function save() {
    if (!allianceCode) return;

    const rem = reminderChannelId.trim();
    const al  = alertsChannelId.trim();
    const an  = announcementsChannelId.trim();

    if (rem && !isId(rem)) return alert("Reminder channel must be a Discord channel ID (numbers only).");
    if (al && !isId(al)) return alert("Alerts channel must be a Discord channel ID (numbers only).");
    if (an && !isId(an)) return alert("Announcements channel must be a Discord channel ID (numbers only).");

    setStatus("Saving…");

    const u = await supabase
      .from("alliance_discord_defaults")
      .upsert({
        alliance_code: allianceCode,
        reminder_channel_id: rem || null,
        alerts_channel_id: al || null,
        announcements_channel_id: an || null,
      });

    if (u.error) { setStatus(u.error.message); alert(u.error.message); return; }

    setStatus("Saved ✅");
    window.setTimeout(() => setStatus(""), 900);
    await load();
  }

  return (
    <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>🛰️ Discord Channels</div>
        <div style={{ opacity: 0.8, fontSize: 12 }}>{status}</div>
      </div>

      <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
        Tip: Discord → Settings → Advanced → Developer Mode → right-click a channel → Copy Channel ID.
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Reminder Channel ID</div>
          <input value={reminderChannelId} onChange={(e) => setReminderChannelId(e.target.value)} placeholder="(optional)" disabled={!canManage} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Alerts Channel ID</div>
          <input value={alertsChannelId} onChange={(e) => setAlertsChannelId(e.target.value)} placeholder="(optional)" disabled={!canManage} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Announcements Channel ID</div>
          <input value={announcementsChannelId} onChange={(e) => setAnnouncementsChannelId(e.target.value)} placeholder="(optional)" disabled={!canManage} />
        </label>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {canManage ? (
          <button type="button" onClick={() => void save()}>Save</button>
        ) : (
          <div style={{ opacity: 0.75, fontSize: 12 }}>View-only (Owner/Admin or R5/R4 can edit)</div>
        )}
        <div style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12 }}>
          Alliance: <code>{allianceCode}</code>
        </div>
      </div>
    </div>
  );
}
