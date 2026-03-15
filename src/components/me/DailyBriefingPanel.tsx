import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type ThreadRow = { unread_count: number | null };
type EventRow = { event_id?: string; title?: string; starts_at?: string };
type AlertRow = {
  id: string;
  title: string;
  pinned?: boolean | null;
  created_at: string;
  is_acked?: boolean | null;
  severity?: string | null;
};

type MailPreviewRow = {
  id?: string;
  created_at?: string | null;
  kind?: string | null;
  subject?: string | null;
  body?: string | null;
  sender_display_name?: string | null;
  from_display_name?: string | null;
  direction?: string | null;
  peer_display_name?: string | null;
  unread_count?: number | null;
  thread_key?: string | null;
  thread_id?: string | null;
};

function s(v: unknown) {
  return v === null || v === undefined ? "" : String(v);
}

function fmt(dt?: string | null) {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return s(dt);
  }
}

function snippet(text: unknown, max = 90) {
  const clean = s(text).replace(/\s+/g, " ").trim();
  if (!clean) return "(no preview)";
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

function threadKeyOf(m: Partial<MailPreviewRow>) {
  return s(m.thread_key || m.thread_id).trim();
}

function buildThreadLink(threadKey: string) {
  const params = new URLSearchParams();
  if (s(threadKey).trim()) params.set("thread", s(threadKey).trim());
  return "/mail-threads?" + params.toString();
}

function whoLine(m: MailPreviewRow) {
  const sender = s(m.sender_display_name || m.from_display_name || "Unknown");
  if (s(m.kind) !== "direct") return "From: " + sender;
  if (s(m.direction) === "out") return "To: " + s(m.peer_display_name || "Unknown");
  return "From: " + sender;
}

export default function DailyBriefingPanel() {
  const nav = useNavigate();

  const [unreadMail, setUnreadMail] = useState<number>(0);
  const [eventsToday, setEventsToday] = useState<number>(0);
  const [unackedAlerts, setUnackedAlerts] = useState<number>(0);

  const [topAlerts, setTopAlerts] = useState<AlertRow[]>([]);
  const [latestMail, setLatestMail] = useState<MailPreviewRow[]>([]);
  const [status, setStatus] = useState<string>("");

  const stateCode = "789";

  async function load() {
    setStatus("Loading…");

    try {
      const [threadRes, eventsRes, alertsRes, mailRes] = await Promise.all([
        supabase.from("v_my_mail_threads").select("unread_count"),
        supabase.from("v_my_events_today").select("event_id"),
        supabase
          .from("v_my_state_alerts")
          .select("id,title,pinned,created_at,is_acked,severity")
          .eq("state_code", stateCode)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("v_my_mail_inbox")
          .select("id,created_at,kind,subject,body,sender_display_name,from_display_name,direction,peer_display_name,unread_count,thread_key,thread_id")
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      if (!threadRes.error) {
        const total = (threadRes.data ?? []).reduce((a: number, r: any) => a + Number((r as ThreadRow).unread_count || 0), 0);
        setUnreadMail(total);
      }

      if (!eventsRes.error) {
        setEventsToday((eventsRes.data ?? []).length);
      }

      if (!alertsRes.error) {
        const rows = (alertsRes.data ?? []) as AlertRow[];
        setTopAlerts(rows.slice(0, 3));
        setUnackedAlerts(rows.filter((r) => !r.is_acked).length);
      }

      if (!mailRes.error) {
        setLatestMail((mailRes.data ?? []) as MailPreviewRow[]);
      }

      setStatus("");
    } catch (e: any) {
      setStatus(s(e?.message || e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const pills = useMemo(
    () => [
      { label: "Mail", value: unreadMail, to: "/mail", emoji: "📬" },
      { label: "State Alerts", value: unackedAlerts, to: "/state/789/alerts-db", emoji: "🚨" },
      { label: "Events Today", value: eventsToday, to: "/dashboard", emoji: "📅" },
    ],
    [unreadMail, unackedAlerts, eventsToday]
  );

  return (
    <div className="zombie-card" style={{ padding: 14, borderRadius: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 18 }}>🧭 Daily Briefing</div>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            {status || "Unread mail, live alerts, and quick personal command-center visibility."}
          </div>
        </div>
        <button type="button" onClick={() => void load()}>Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {pills.map((p) => (
          <button
            key={p.label}
            type="button"
            className="zombie-card"
            style={{ padding: 12, borderRadius: 14, textAlign: "left", minWidth: 220 }}
            onClick={() => nav(p.to)}
          >
            <div style={{ fontWeight: 900 }}>{p.emoji} {p.label}</div>
            <div style={{ color: "rgba(243,247,242,0.88)", fontSize: 12 }}>Count: <b style={{ color: "#ffffff" }}>{p.value}</b></div>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Latest Mail</div>
            <button type="button" onClick={() => nav("/mail")} style={{ padding: "8px 10px", borderRadius: 12 }}>
              Open Mail
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {latestMail.length ? latestMail.map((m, idx) => {
              const threadKey = threadKeyOf(m);
              return (
                <button
                  key={(s(m.id) || "mail") + "-" + idx}
                  type="button"
                  onClick={() => nav(threadKey ? buildThreadLink(threadKey) : "/mail")}
                  style={{
                    textAlign: "left",
                    border: Number(m.unread_count || 0) > 0 ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.10)",
                    background: Number(m.unread_count || 0) > 0 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.16)",
                    borderRadius: 14,
                    padding: 10,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900 }}>
                        {s(m.subject) || "(no subject)"}
                      </div>
                      <div style={{ opacity: 0.76, fontSize: 12, marginTop: 4 }}>
                        {whoLine(m)}
                      </div>
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 11, whiteSpace: "nowrap" }}>
                      {fmt(m.created_at)}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, opacity: 0.92 }}>
                    {snippet(m.body)}
                  </div>

                  {Number(m.unread_count || 0) > 0 ? (
                    <div style={{ marginTop: 8, fontSize: 11, fontWeight: 900, opacity: 0.92 }}>
                      Unread • {Number(m.unread_count || 0)}
                    </div>
                  ) : null}
                </button>
              );
            }) : (
              <div style={{ opacity: 0.7 }}>No mail yet.</div>
            )}
          </div>
        </div>

        <div className="zombie-card" style={{ padding: 12, borderRadius: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Latest State Alerts</div>
            <button type="button" onClick={() => nav("/state/789/alerts")} style={{ padding: "8px 10px", borderRadius: 12 }}>
              Open Alerts
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {topAlerts.length ? topAlerts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => nav("/state/789/alerts")}
                style={{
                  textAlign: "left",
                  border: !a.is_acked ? "1px solid rgba(255,120,120,0.30)" : "1px solid rgba(255,255,255,0.10)",
                  background: !a.is_acked ? "rgba(255,120,120,0.08)" : "rgba(0,0,0,0.16)",
                  borderRadius: 14,
                  padding: 10,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 900 }}>
                  {a.pinned ? "📌 " : ""}{s(a.title)}
                </div>
                <div style={{ marginTop: 6, opacity: 0.76, fontSize: 12 }}>
                  {s(a.severity || "alert")} • {fmt(a.created_at)} {!a.is_acked ? "• needs ack" : ""}
                </div>
              </button>
            )) : (
              <div style={{ opacity: 0.7 }}>No alerts found.</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => nav("/mail")} style={{ padding: "10px 12px", borderRadius: 12 }}>
          📬 Mail
        </button>
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
