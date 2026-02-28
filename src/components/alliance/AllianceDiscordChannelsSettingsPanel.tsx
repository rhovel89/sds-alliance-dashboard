import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Chan = { id: string; channel_id: string; channel_name: string | null };

function isId(s: string) { return /^\d{10,25}$/.test(String(s || "").trim()); }

export default function AllianceDiscordChannelsSettingsPanel() {
  const { alliance_id } = useParams();
  const allianceCode = useMemo(() => String(alliance_id || "").toUpperCase(), [alliance_id]);

  const [canManage, setCanManage] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [channels, setChannels] = useState<Chan[]>([]);
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  const [alertsDefault, setAlertsDefault] = useState("");
  const [annDefault, setAnnDefault] = useState("");
  const [remDefault, setRemDefault] = useState("");

  async function load() {
    if (!allianceCode) return;
    setStatus("");

    const cm = await supabase.rpc("can_manage_alliance_discord_settings", { p_alliance_code: allianceCode });
    if (!cm.error) setCanManage(!!cm.data);

    const list = await supabase
      .from("alliance_discord_channels")
      .select("id,channel_id,channel_name")
      .eq("alliance_code", allianceCode)
      .order("channel_name", { ascending: true });

    if (!list.error) setChannels((list.data || []) as any);

    const def = await supabase
      .from("alliance_discord_defaults")
      .select("alerts_channel_id,announcements_channel_id,reminder_channel_id")
      .eq("alliance_code", allianceCode)
      .maybeSingle();

    if (!def.error) {
      setAlertsDefault(String(def.data?.alerts_channel_id || ""));
      setAnnDefault(String(def.data?.announcements_channel_id || ""));
      setRemDefault(String(def.data?.reminder_channel_id || ""));
    }
  }

  useEffect(() => { void load(); }, [allianceCode]);

  async function addChannel() {
    const id = newId.trim();
    const nm = newName.trim();
    if (!isId(id)) return alert("Channel ID must be numbers only (10–25 digits).");

    setStatus("Adding…");
    const r = await supabase.from("alliance_discord_channels").insert({
      alliance_code: allianceCode,
      channel_id: id,
      channel_name: nm || null,
    });
    if (r.error) { setStatus(r.error.message); alert(r.error.message); return; }

    setNewId(""); setNewName("");
    setStatus("Added ✅");
    await load();
  }

  async function delChannel(row: Chan) {
    const ok = confirm(`Delete channel ${row.channel_name || row.channel_id}?`);
    if (!ok) return;

    const r = await supabase.from("alliance_discord_channels").delete().eq("id", row.id);
    if (r.error) { alert(r.error.message); return; }
    await load();
  }

  async function saveDefaults() {
    const a = alertsDefault.trim();
    const n = annDefault.trim();
    const r = remDefault.trim();

    if (a && !isId(a)) return alert("Alerts default must be a channel ID.");
    if (n && !isId(n)) return alert("Announcements default must be a channel ID.");
    if (r && !isId(r)) return alert("Reminders default must be a channel ID.");

    setStatus("Saving…");
    const u = await supabase.from("alliance_discord_defaults").upsert({
      alliance_code: allianceCode,
      alerts_channel_id: a || null,
      announcements_channel_id: n || null,
      reminder_channel_id: r || null,
    });
    if (u.error) { setStatus(u.error.message); alert(u.error.message); return; }

    setStatus("Saved ✅");
    await load();
  }

  function optLabel(c: Chan) {
    return `${c.channel_name || "(unnamed)"} • ${c.channel_id}`;
  }

  return (
    <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 950 }}>🛰️ Discord Channels (R5/R4)</div>
        <div style={{ opacity: 0.8, fontSize: 12 }}>{status}</div>
      </div>

      <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
        Discord → Settings → Advanced → Developer Mode → right-click channel → Copy Channel ID.
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 13 }}>Saved channels (dropdown source)</div>

        {channels.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{optLabel(c)}</div>
            {canManage ? <button onClick={() => void delChannel(c)}>Delete</button> : null}
          </div>
        ))}
        {!channels.length ? <div style={{ opacity: 0.8, fontSize: 12 }}>(none yet)</div> : null}

        {canManage ? (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="#alerts (name)" style={{ width: 200 }} />
            <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="Channel ID" style={{ width: 260 }} />
            <button onClick={() => void addChannel()}>Add Channel</button>
          </div>
        ) : (
          <div style={{ opacity: 0.75, fontSize: 12 }}>View-only</div>
        )}

        <div style={{ marginTop: 10, fontWeight: 900, fontSize: 13 }}>Defaults used when you pick “Default”</div>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Alerts default</div>
          <select value={alertsDefault} onChange={(e) => setAlertsDefault(e.target.value)} disabled={!canManage}>
            <option value="">(none)</option>
            {channels.map((c) => <option key={c.id} value={c.channel_id}>{optLabel(c)}</option>)}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Announcements default</div>
          <select value={annDefault} onChange={(e) => setAnnDefault(e.target.value)} disabled={!canManage}>
            <option value="">(none)</option>
            {channels.map((c) => <option key={c.id} value={c.channel_id}>{optLabel(c)}</option>)}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Reminders default</div>
          <select value={remDefault} onChange={(e) => setRemDefault(e.target.value)} disabled={!canManage}>
            <option value="">(none)</option>
            {channels.map((c) => <option key={c.id} value={c.channel_id}>{optLabel(c)}</option>)}
          </select>
        </label>

        {canManage ? <button onClick={() => void saveDefaults()}>Save Defaults</button> : null}
      </div>
    </div>
  );
}
