import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Row = { id: string; channel_id: string; channel_name: string | null };
function isId(s: string) { return /^\d{10,25}$/.test(String(s || "").trim()); }

export default function AllianceDiscordChannelsManagerPanel() {
  const { alliance_id } = useParams();
  const allianceCode = useMemo(() => String(alliance_id || "").toUpperCase(), [alliance_id]);

  const [canManage, setCanManage] = useState(false);
  const [status, setStatus] = useState("");

  const [rows, setRows] = useState<Row[]>([]);
  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");

  const [defAlerts, setDefAlerts] = useState("");
  const [defAnn, setDefAnn] = useState("");

  async function load() {
    if (!allianceCode) return;
    setStatus("");

    const cm = await supabase.rpc("can_manage_alliance_discord_settings" as any, { p_alliance_code: allianceCode } as any);
    setCanManage(!cm.error && !!cm.data);

    const list = await supabase
      .from("alliance_discord_channels")
      .select("id,channel_id,channel_name")
      .eq("alliance_code", allianceCode)
      .order("channel_name", { ascending: true });

    if (!list.error) setRows((list.data || []) as any);

    const defs = await supabase
      .from("alliance_discord_defaults")
      .select("alerts_channel_id,announcements_channel_id")
      .eq("alliance_code", allianceCode)
      .maybeSingle();

    if (!defs.error) {
      setDefAlerts(String(defs.data?.alerts_channel_id || ""));
      setDefAnn(String(defs.data?.announcements_channel_id || ""));
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
    } as any);

    if (r.error) { setStatus(r.error.message); alert(r.error.message); return; }
    setNewId(""); setNewName("");
    setStatus("Added ✅");
    await load();
  }

  async function del(row: Row) {
    const ok = confirm(`Delete ${row.channel_name || row.channel_id}?`);
    if (!ok) return;
    const r = await supabase.from("alliance_discord_channels").delete().eq("id", row.id);
    if (r.error) { alert(r.error.message); return; }
    await load();
  }

  async function saveDefaults() {
    const a = defAlerts.trim();
    const n = defAnn.trim();
    if (a && !isId(a)) return alert("Alerts default must be a channel ID.");
    if (n && !isId(n)) return alert("Announcements default must be a channel ID.");

    setStatus("Saving…");
    const r = await supabase.from("alliance_discord_defaults").upsert({
      alliance_code: allianceCode,
      alerts_channel_id: a || null,
      announcements_channel_id: n || null,
    } as any);

    if (r.error) { setStatus(r.error.message); alert(r.error.message); return; }
    setStatus("Saved ✅");
    await load();
  }

    async function queueTestPing() {
    try {
      setTesting(true);
      const msg = "✅ Discord channel test ping from State Alliance Dashboard";

      const q = await supabase.rpc("queue_discord_send" as any, {
        p_state_code: "789",
        p_alliance_code: allianceCode,
        p_kind: "announcements",
        p_channel_id: testChannelId || "",
        p_message: msg,
      } as any);

      if (q.error) throw q.error;
      alert("Queued test ping ✅ (worker will send)");
    } catch (e) {
      console.error(e);
      alert("Test ping failed (DB/RLS/queue).");
    } finally {
      setTesting(false);
    }
  }
function label(r: Row) { return `${r.channel_name || "(unnamed)"} • ${r.channel_id}`; }

  return (
    <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 950 }}>🛰️ Discord Channels (R5/R4)</div>
        <div style={{ opacity: 0.8, fontSize: 12 }}>{status}</div>
      </div>

      <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
        Discord → Settings → Advanced → Developer Mode → right-click channel → Copy Channel ID.
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Saved channels (dropdown source)</div>
        {rows.length ? (
          <div style={{ display: "grid", gap: 6 }}>
            {rows.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 12, opacity: 0.9 }}>{label(r)}</div>
                {canManage ? <button onClick={() => void del(r)}>Delete</button> : null}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ opacity: 0.8, fontSize: 12 }}>(none yet)</div>
        )}

        {canManage ? (
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="#alerts (name)" style={{ width: 220 }} />
            <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="Channel ID" style={{ width: 260 }} />
            <button onClick={() => void addChannel()}>Add Channel</button>
          </div>
        ) : (
          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>View-only</div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }      <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Test ping</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={testChannelId}
            onChange={(e) => setTestChannelId(e.target.value)}
            disabled={!canManage || testing}
            style={{ padding: "8px 10px", borderRadius: 10 }}
          >
            <option value="">Default (uses alliance default)</option>
            {rows.map((r) => (
              <option key={r.id} value={r.channel_id}>{label(r)}</option>
            ))}
          </select>

          {canManage ? (
            <button disabled={testing} onClick={() => void queueTestPing()}>
              {testing ? "Queuing…" : "Queue Test Ping"}
            </button>
          ) : (
            <div style={{ opacity: 0.75, fontSize: 12 }}>View-only</div>
          )}
        </div>
      </div>
}>Defaults (used when dropdown = Default)</div>

        <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Alerts default</div>
          <select value={defAlerts} onChange={(e) => setDefAlerts(e.target.value)} disabled={!canManage} style={{ padding: "8px 10px", borderRadius: 10 }}>
            <option value="">(none)</option>
            {rows.map((r) => <option key={r.id} value={r.channel_id}>{label(r)}</option>)}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.9 }}>Announcements default</div>
          <select value={defAnn} onChange={(e) => setDefAnn(e.target.value)} disabled={!canManage} style={{ padding: "8px 10px", borderRadius: 10 }}>
            <option value="">(none)</option>
            {rows.map((r) => <option key={r.id} value={r.channel_id}>{label(r)}</option>)}
          </select>
        </label>

        {canManage ? (
          <div style={{ marginTop: 10 }}>
            <button onClick={() => void saveDefaults()}>Save Defaults</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

