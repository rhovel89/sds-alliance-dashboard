import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

type ThreadRow = { unread_count: number };
type BulletinRow = { id: string; title: string; pinned: boolean; created_at: string; expires_at: string | null };
type EventRow = { event_id?: string; title?: string; starts_at?: string };

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString(); } catch { return dt; }
}

export default function DailyBriefingPanel() {
  const nav = useNavigate();

  const [unread, setUnread] = useState<number>(0);
  const [eventsToday, setEventsToday] = useState<number>(0);
  const [bulletinsCount, setBulletinsCount] = useState<number>(0);

  const [topBulletins, setTopBulletins] = useState<BulletinRow[]>([]);
  const [status, setStatus] = useState<string>("");

  const stateCode = "789";

  async function load() {
    setStatus("Loading…");

    // Mail unread (best-effort)
    try {
      const t = await supabase.from("v_my_mail_threads").select("unread_count");
      if (!t.error) {
        const total = (t.data ?? []).reduce((a: number, r: any) => a + Number((r as ThreadRow).unread_count || 0), 0);
        setUnread(total);
      }
    } catch {}

    // Events today count (best-effort; if view doesn't exist, keep 0)
    try {
      const e = await supabase.from("v_my_events_today").select("event_id");
      if (!e.error) setEventsToday((e.data ?? []).length);
    } catch {}

    // Bulletins: count + top list (best-effort)
    try {
      const b = await supabase
        .from("state_bulletins")
        .select("id,title,pinned,created_at,expires_at")
        .eq("state_code", stateCode)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (!b.error) {
        const now = Date.now();
        const rows = ((b.data ?? []) as any as BulletinRow[]).filter((r) => {
          if (!r.expires_at) return true;
          const t = Date.parse(r.expires_at);
          return isNaN(t) ? true : t > now;
        });

        setTopBulletins(rows.slice(0, 3));
        setBulletinsCount(rows.length);
      }
    } catch {}

    setStatus("");
  }

  useEffect(() => { void load(); }, []);

  const pills = useMemo(() => ([
    { label: "Mail", value: unread, to: "/mail-threads", emoji: "📬" },
    { label: "Events Today", value: eventsToday, to: "/dashboard", emoji: "📅" },
    { label: "State Bulletins", value: bulletinsCount, to: "/state/789", emoji: "📌" },
  ]), [unread, eventsToday, bulletinsCount]);

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 16 }}>🧭 Daily Briefing</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>{status}</div>
        </div>
        <button type="button" onClick={() => void load()}>Refresh</button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {pills.map((p) => (
          <button
            key={p.label}
            type="button"
            className="zombie-card"
            style={{ padding: 12, borderRadius: 14, textAlign: "left", minWidth: 220 }}
            onClick={() => nav(p.to)}
          >
            <div style={{ fontWeight: 900 }}>{p.emoji} {p.label}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>Count: <b>{p.value}</b></div>
          </button>
        ))}
      </div>

      {topBulletins.length ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 900, opacity: 0.95 }}>Top Bulletins</div>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {topBulletins.map((b) => (
              <div key={b.id} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>{b.pinned ? "📌 " : ""}{b.title}</div>
                <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12 }}>
                  {fmt(b.created_at)} {b.expires_at ? ` • Expires: ${fmt(b.expires_at)}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => nav("/state/789/alerts")} style={{ padding: "10px 12px", borderRadius: 12 }}>
          🚨 State Alerts
        </button>
        <button type="button" onClick={() => nav("/state/789/discussion")} style={{ padding: "10px 12px", borderRadius: 12 }}>
          💬 State Discussion
        </button>
        <button type="button" onClick={() => nav("/state/789/achievements")} style={{ padding: "10px 12px", borderRadius: 12 }}>
          🏆 Achievements
        </button>
      </div>
    </div>
  );
}
