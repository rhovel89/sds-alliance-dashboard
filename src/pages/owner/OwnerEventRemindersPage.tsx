import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import SupportBundleButton from "../../components/system/SupportBundleButton";

type Row = any;

export default function OwnerEventRemindersPage() {
  const [stateCode, setStateCode] = useState("789");
  const [hours, setHours] = useState("24");
  const [status, setStatus] = useState<string>("");

  const [recent, setRecent] = useState<Row[]>([]);

  async function loadRecent() {
    const r = await supabase
      .from("discord_send_queue")
      .select("id,created_at,state_code,alliance_code,channel_name,status,send_at,event_id,reminder_minutes_before,message")
      .eq("state_code", stateCode)
      .order("created_at", { ascending: false })
      .limit(50);

    if (r.error) return;
    setRecent(r.data ?? []);
  }

  useEffect(() => { void loadRecent(); }, [stateCode]);

  async function run() {
    setStatus("Generating…");
    const n = Number(hours || 24);
    const r = await supabase.rpc("queue_event_reminders", { p_state_code: stateCode, p_hours: n });
    if (r.error) { setStatus(r.error.message); alert(r.error.message); return; }
    setStatus(`Queued ${r.data ?? 0} reminders ✅`);
    await loadRecent();
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>⏰ Event Reminders → Discord Queue</h2>
        <SupportBundleButton />
      </div>

      <div style={{ marginTop: 8, opacity: 0.85, fontSize: 12 }}>
        {status || "Queues reminders only (no sending). Later bot/edge will send when send_at <= now()."}
      </div>

      <div className="zombie-card" style={{ marginTop: 12, padding: 12, borderRadius: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 900 }}>State</span>
            <input value={stateCode} onChange={(e) => setStateCode(e.target.value)} style={{ width: 90 }} />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 900 }}>Horizon (hours)</span>
            <input value={hours} onChange={(e) => setHours(e.target.value)} style={{ width: 90 }} />
          </label>

          <button type="button" onClick={() => void run()}>Generate Reminders</button>

          <a href="/owner/discord-queue-db" style={{ opacity: 0.85, fontSize: 12, marginLeft: "auto" }}>
            View full queue →
          </a>
        </div>

        <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
          Requires events to have <b>send_reminders=true</b> and <b>discord_channel_id</b> set.
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 950 }}>Recent queued reminder rows (last 50)</div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {recent.map((r: any) => (
            <div key={r.id} className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 900 }}>
                  {r.status} • {r.alliance_code || "—"} • {r.reminder_minutes_before ?? "?"}m
                </div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  send_at: {r.send_at ? new Date(r.send_at).toLocaleString() : "—"}
                </div>
              </div>
              <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{String(r.message || "")}</div>
            </div>
          ))}
          {!recent.length ? <div style={{ opacity: 0.8 }}>No reminder rows yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
