import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type EventRow = {
  id: string;
  alliance_id?: string | null;
  title?: string | null;
  event_name?: string | null;
  event_type?: string | null;
  event_category?: string | null;
  start_time_utc?: string | null;
  start_date?: string | null;
  start_time?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  recurring_enabled?: boolean | null;
  recurrence_type?: string | null;
  recurrence?: string | null;
  recurrence_days?: string[] | null;
  days_of_week?: string[] | null;
  recurrence_end_date?: string | null;
};

type ExpandedAgendaEvent = EventRow & {
  _source_event_id: string;
  _occurrence_time_utc: string;
  _occurrence_local_date: string;
  _occurrence_local_time: string;
};

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function toLocalISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYmdLocal(iso: string): { y: number; m: number; d: number } | null {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function dateFromYmdNoon(iso: string): Date | null {
  const p = parseYmdLocal(iso);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d, 12, 0, 0, 0);
}

function parseHmLocal(v: string): { hh: number; mm: number } {
  const m = String(v || "").match(/^(\d{2}):(\d{2})/);
  if (!m) return { hh: 0, mm: 0 };
  return { hh: Number(m[1]), mm: Number(m[2]) };
}

function startOfWeekLocalNoon(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay(), 12, 0, 0, 0);
}

function recurrenceDayNums(ev: any): number[] {
  const raw = Array.isArray(ev?.recurrence_days)
    ? ev.recurrence_days
    : Array.isArray(ev?.days_of_week)
    ? ev.days_of_week
    : [];

  const nums = raw
    .map((x: any) => {
      const key = String(x || "").trim().toLowerCase();
      return Object.prototype.hasOwnProperty.call(DAY_MAP, key) ? DAY_MAP[key] : null;
    })
    .filter((x: number | null): x is number => x !== null);

  if (nums.length) return nums;

  const baseDate = dateFromYmdNoon(String(ev?.start_date || ""));
  if (baseDate) return [baseDate.getDay()];

  if (ev?.start_time_utc) {
    const d = new Date(String(ev.start_time_utc));
    if (!Number.isNaN(d.getTime())) return [d.getDay()];
  }

  return [];
}

function localTimeLabelFromEvent(ev: any) {
  const hm = parseHmLocal(String(ev?.start_time || ""));
  const d = new Date(2000, 0, 1, hm.hh, hm.mm, 0, 0);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function occurrenceLocalDate(ev: any) {
  return String(ev?._occurrence_local_date || ev?.start_date || "");
}

function occurrenceLocalTime(ev: any) {
  if (ev?._occurrence_local_time) return String(ev._occurrence_local_time);
  return localTimeLabelFromEvent(ev);
}

function expandWeekLocally(rows: EventRow[], weekStartNoon: Date): ExpandedAgendaEvent[] {
  const out: ExpandedAgendaEvent[] = [];
  const weekDays: Date[] = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStartNoon.getFullYear(), weekStartNoon.getMonth(), weekStartNoon.getDate(), 12, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  });

  for (const ev of rows) {
    const baseDateIso = String(ev.start_date || "");
    const baseDateNoon = dateFromYmdNoon(baseDateIso);
    if (!baseDateNoon) continue;

    const hm = parseHmLocal(String(ev.start_time || ""));
    const baseDateTime = new Date(
      baseDateNoon.getFullYear(),
      baseDateNoon.getMonth(),
      baseDateNoon.getDate(),
      hm.hh,
      hm.mm,
      0,
      0
    );

    const baseTimeLabel = baseDateTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const weekStartIso = toLocalISODate(weekDays[0]);
    const weekEndIso = toLocalISODate(weekDays[6]);

    if (baseDateIso >= weekStartIso && baseDateIso <= weekEndIso) {
      out.push({
        ...(ev as any),
        _source_event_id: String(ev.id),
        _occurrence_time_utc: String(ev.start_time_utc || baseDateTime.toISOString()),
        _occurrence_local_date: baseDateIso,
        _occurrence_local_time: baseTimeLabel,
        start_time_utc: String(ev.start_time_utc || baseDateTime.toISOString()),
      });
    }

    const rtype = String(ev.recurrence_type || ev.recurrence || "").toLowerCase();
    const recurring = !!ev.recurring_enabled && !!rtype;
    if (!recurring) continue;

    const allowedDays = recurrenceDayNums(ev);
    const endDateNoon = dateFromYmdNoon(String(ev.recurrence_end_date || ""));

    for (const candNoon of weekDays) {
      const candIso = toLocalISODate(candNoon);

      if (candNoon < baseDateNoon) continue;
      if (endDateNoon && candNoon > endDateNoon) continue;

      if (rtype === "daily") {
        // keep
      } else if (rtype === "weekly") {
        if (!allowedDays.includes(candNoon.getDay())) continue;
      } else if (rtype === "biweekly") {
        if (!allowedDays.includes(candNoon.getDay())) continue;

        const baseWeek = startOfWeekLocalNoon(baseDateNoon).getTime();
        const candWeek = startOfWeekLocalNoon(candNoon).getTime();
        const weeksDiff = Math.floor((candWeek - baseWeek) / (7 * 24 * 60 * 60 * 1000));
        if (weeksDiff % 2 !== 0) continue;
      } else if (rtype === "monthly") {
        if (candNoon.getDate() !== baseDateNoon.getDate()) continue;
      } else {
        continue;
      }

      if (candIso === baseDateIso) continue;

      const candDateTime = new Date(
        candNoon.getFullYear(),
        candNoon.getMonth(),
        candNoon.getDate(),
        hm.hh,
        hm.mm,
        0,
        0
      );

      out.push({
        ...(ev as any),
        _source_event_id: String(ev.id),
        _occurrence_time_utc: candDateTime.toISOString(),
        _occurrence_local_date: candIso,
        _occurrence_local_time: baseTimeLabel,
        start_time_utc: candDateTime.toISOString(),
      });
    }
  }

  return out;
}

function formatUtcLabel(utcIso: string) {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

function formatDayHeader(iso: string) {
  const p = parseYmdLocal(iso);
  if (!p) return iso;
  const d = new Date(p.y, p.m - 1, p.d, 12, 0, 0, 0);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function weekRangeLabel(weekStartNoon: Date) {
  const weekEnd = new Date(weekStartNoon.getFullYear(), weekStartNoon.getMonth(), weekStartNoon.getDate(), 12, 0, 0, 0);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const a = weekStartNoon.toLocaleDateString([], { month: "short", day: "numeric" });
  const b = weekEnd.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${a} – ${b}`;
}

export default function WeeklyAgendaCard() {
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [items, setItems] = useState<ExpandedAgendaEvent[]>([]);
  const [allianceCodes, setAllianceCodes] = useState<string[]>([]);
  const [displayUtc, setDisplayUtc] = useState<boolean>(() => {
    try {
      return localStorage.getItem("calendar.timeMode") === "utc";
    } catch {
      return false;
    }
  });

  const weekStart = useMemo(() => {
    const now = new Date();
    const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    return startOfWeekLocalNoon(noon);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("calendar.timeMode", displayUtc ? "utc" : "local");
    } catch {}
  }, [displayUtc]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMsg("");

      try {
        const me = await supabase.auth.getUser();
        const uid = me.data?.user?.id || null;
        if (!uid) throw new Error("No signed-in user.");

        const link = await supabase
          .from("player_auth_links")
          .select("player_id")
          .eq("user_id", uid)
          .limit(1)
          .maybeSingle();

        if (link.error) throw link.error;

        const playerId = String((link.data as any)?.player_id || "").trim();
        if (!playerId) {
          if (!cancelled) {
            setAllianceCodes([]);
            setItems([]);
            setMsg("No linked player found.");
          }
          return;
        }

        const memberships = await supabase
          .from("player_alliances")
          .select("alliance_code,role")
          .eq("player_id", playerId)
          .order("alliance_code", { ascending: true });

        if (memberships.error) throw memberships.error;

        const codes = Array.from(
          new Set(
            ((memberships.data || []) as any[])
              .map((x) => String(x?.alliance_code || "").trim().toUpperCase())
              .filter(Boolean)
          )
        );

        if (!cancelled) setAllianceCodes(codes);

        if (!codes.length) {
          if (!cancelled) {
            setItems([]);
            setMsg("No alliance memberships found.");
          }
          return;
        }

        const evs = await supabase
          .from("alliance_events")
          .select("*")
          .in("alliance_id", codes)
          .order("start_time_utc", { ascending: true })
          .limit(500);

        if (evs.error) throw evs.error;

        const expanded = expandWeekLocally((evs.data || []) as any, weekStart)
          .sort((a, b) => {
            const da = new Date(String(a._occurrence_time_utc || a.start_time_utc || "")).getTime();
            const db = new Date(String(b._occurrence_time_utc || b.start_time_utc || "")).getTime();
            return da - db;
          });

        if (!cancelled) {
          setItems(expanded);
        }
      } catch (e: any) {
        if (!cancelled) {
          setMsg(String(e?.message || e || "Failed to load weekly agenda."));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  const grouped = useMemo(() => {
    const map: Record<string, ExpandedAgendaEvent[]> = {};
    for (const item of items) {
      const key = occurrenceLocalDate(item);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }

    return Object.keys(map)
      .sort()
      .map((key) => ({
        day: key,
        items: map[key],
      }));
  }, [items]);

  const modeLabel = displayUtc ? "Puzzle & Survival UTC" : "Local";
  const firstAlliance = allianceCodes[0] || "";

  return (
    <div
      className="zombie-card"
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 950 }}>This Week</div>
          <div style={{ fontSize: 12, opacity: 0.76, marginTop: 4 }}>
            Alliance agenda for {weekRangeLabel(weekStart)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.82 }}>Times</div>

          <button
            type="button"
            className="zombie-btn"
            onClick={() => setDisplayUtc(false)}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: !displayUtc ? "1px solid rgba(120,255,120,0.35)" : "1px solid #333",
              background: !displayUtc ? "rgba(120,255,120,0.10)" : "rgba(255,255,255,0.03)",
            }}
          >
            Local
          </button>

          <button
            type="button"
            className="zombie-btn"
            onClick={() => setDisplayUtc(true)}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: displayUtc ? "1px solid rgba(120,180,255,0.35)" : "1px solid #333",
              background: displayUtc ? "rgba(120,180,255,0.12)" : "rgba(255,255,255,0.03)",
            }}
          >
            Puzzle & Survival UTC
          </button>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.72 }}>
        Showing this week only • Mode: {modeLabel}
      </div>

      {loading ? (
        <div style={{ marginTop: 14, opacity: 0.78 }}>Loading weekly agenda…</div>
      ) : msg ? (
        <div style={{ marginTop: 14, opacity: 0.82 }}>{msg}</div>
      ) : grouped.length === 0 ? (
        <div style={{ marginTop: 14, opacity: 0.78 }}>No events scheduled this week.</div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {grouped.map((group) => (
            <div
              key={group.day}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 900, marginBottom: 8 }}>{formatDayHeader(group.day)}</div>

              <div style={{ display: "grid", gap: 8 }}>
                {group.items.map((item) => (
                  <div
                    key={`${item._source_event_id}__${item._occurrence_local_date}__${item._occurrence_time_utc}`}
                    style={{
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 12,
                      padding: 10,
                      background: "rgba(0,0,0,0.18)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 800 }}>
                        {displayUtc
                          ? formatUtcLabel(String(item._occurrence_time_utc || item.start_time_utc || ""))
                          : occurrenceLocalTime(item)}
                        {" — "}
                        {String(item.title || item.event_name || "Untitled")}
                      </div>

                      <div style={{ fontSize: 12, opacity: 0.78 }}>
                        {String(item.alliance_id || "")}
                      </div>
                    </div>

                    <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, opacity: 0.82 }}>
                      {item.event_category ? <span>{String(item.event_category)}</span> : null}
                      {item.event_type ? <span>{String(item.event_type)}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {allianceCodes.length ? (
        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {allianceCodes.map((code) => (
            <a
              key={code}
              href={`/dashboard/${encodeURIComponent(code)}/calendar`}
              style={{ textDecoration: "none" }}
            >
              <button type="button" className="zombie-btn">
                Open {code} Calendar
              </button>
            </a>
          ))}
        </div>
      ) : firstAlliance ? (
        <div style={{ marginTop: 14 }}>
          <a href={`/dashboard/${encodeURIComponent(firstAlliance)}/calendar`} style={{ textDecoration: "none" }}>
            <button type="button" className="zombie-btn">Open Full Calendar</button>
          </a>
        </div>
      ) : null}
    </div>
  );
}
