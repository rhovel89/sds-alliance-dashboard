import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function DailyBriefingPanel() {
  const nav = useNavigate();
  const [unread, setUnread] = useState<number>(0);
  const [eventsToday, setEventsToday] = useState<number>(0);
  const [bulletins, setBulletins] = useState<number>(0);
  const [status, setStatus] = useState<string>("");

  async function load() {
    setStatus("Loading…");

    // Mail unread (best-effort)
    try {
      const t = await supabase.from("v_my_mail_threads").select("unread_count");
      if (!t.error) {
        const total = (t.data ?? []).reduce((a: number, r: any) => a + Number(r.unread_count || 0), 0);
        setUnread(total);
      }
    } catch {}

    // Events today (best-effort; if view doesn't exist, keep 0)
    try {
      const e = await supabase.from("v_my_events_today").select("event_id");
      if (!e.error) setEventsToday((e.data ?? []).length);
    } catch {}

    // State bulletins count (best-effort)
    try {
      const b = await supabase.from("state_bulletins").select("id").eq("state_code", "789");
      if (!b.error) setBulletins((b.data ?? []).length);
    } catch {}

    setStatus("");
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>🧭 Daily Briefing</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>{status}</div>
        </div>
        <button type="button" onClick={() => void load()}>Refresh</button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <button type="button" className="zombie-card" style={{ padding: 12, borderRadius: 14, textAlign: "left" }} onClick={() => nav("/mail-threads")}>
          <div style={{ fontWeight: 900 }}>📬 Mail</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Unread: <b>{unread}</b></div>
        </button>

        <button type="button" className="zombie-card" style={{ padding: 12, borderRadius: 14, textAlign: "left" }} onClick={() => nav("/dashboard")}>
          <div style={{ fontWeight: 900 }}>📅 Today’s Events</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Events today: <b>{eventsToday}</b></div>
        </button>

        <button type="button" className="zombie-card" style={{ padding: 12, borderRadius: 14, textAlign: "left" }} onClick={() => nav("/state/789")}>
          <div style={{ fontWeight: 900 }}>📌 State Bulletins</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>Active posts: <b>{bulletins}</b></div>
        </button>
      </div>
    </div>
  );
}
