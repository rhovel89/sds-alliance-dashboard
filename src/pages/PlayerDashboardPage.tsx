import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

import PlayerAllianceProfilePanel from "../components/player/PlayerAllianceProfilePanel";

type Membership = {
  alliance_code: string;
  role: string | null;
};

type Announcement = {
  id: string;
  title: string | null;
  body: string | null;
  pinned?: boolean | null;
  created_at?: string | null;
};

type GuideSection = {
  id: string;
  title: string | null;
  updated_at?: string | null;
};

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isManagerRole(role?: string | null) {
  const r = String(role ?? "").toLowerCase();
  return ["owner", "r4", "r5"].includes(r);
}

function bestDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function fmt(d: Date | null) {
  if (!d) return "";
  try { return d.toLocaleString(); } catch { return d.toISOString(); }
}

export default function PlayerDashboardPage() {
  const [sp, setSp] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedAlliance, setSelectedAlliance] = useState<string>("");

  const role = useMemo(() => {
    const m = memberships.find((x) => upper(x.alliance_code) === upper(selectedAlliance));
    return m?.role ?? null;
  }, [memberships, selectedAlliance]);

  const isManager = useMemo(() => isManagerRole(role), [role]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sections, setSections] = useState<GuideSection[]>([]);

  // Live cards
  const [myHqs, setMyHqs] = useState<any[]>([]);
  const [mySlot, setMySlot] = useState<any | null>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  const pickAlliance = (code: string) => {
    const c = upper(code);
    setSelectedAlliance(c);
    const next = new URLSearchParams(sp);
    next.set("alliance", c);
    setSp(next, { replace: true });
  };

  const loadBasics = async () => {
    setLoading(true);
    setErr(null);

    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      setUserId(uid);

      if (!uid) {
        setErr("Please sign in.");
        setLoading(false);
        return;
      }

      // Ensure player row exists (best effort)
      let pid: string | null = null;
      const p1 = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
      if (!p1.error && p1.data?.id) {
        pid = String(p1.data.id);
      } else {
        try {
          const ins = await supabase.from("players").insert({ auth_user_id: uid } as any).select("id").maybeSingle();
          if (!ins.error && ins.data?.id) pid = String(ins.data.id);
        } catch {
          // ignore
        }
      }
      setPlayerId(pid);

      // Memberships (player_alliances)
      if (pid) {
        const mRes = await supabase
          .from("player_alliances")
          .select("alliance_code,role")
          .eq("player_id", pid)
          .order("alliance_code", { ascending: true });

        if (mRes.error) throw mRes.error;

        const ms = (mRes.data ?? []).map((r: any) => ({
          alliance_code: upper(r.alliance_code),
          role: (r.role ?? null) as any,
        })) as Membership[];

        setMemberships(ms);

        // pick selected alliance from query param or first
        const fromQuery = upper(sp.get("alliance"));
        const initial = fromQuery || ms[0]?.alliance_code || "";
        setSelectedAlliance(initial);
      } else {
        setMemberships([]);
        setSelectedAlliance("");
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadLiveCards = async (allianceCode: string) => {
    const code = upper(allianceCode);
    if (!code || !userId) {
      setMyHqs([]);
      setMySlot(null);
      setUpcoming([]);
      return;
    }

    // My HQs (player_hqs)
    try {
      const hRes = await supabase
        .from("player_hqs")
        .select("*")
        .eq("user_id", userId)
        .eq("alliance_id", code)
        .order("created_at", { ascending: true });

      if (!hRes.error) setMyHqs(hRes.data ?? []);
    } catch {}

    // My assigned slot (alliance_hq_map) - best effort
    try {
      const sRes = await supabase
        .from("alliance_hq_map")
        .select("*")
        .eq("alliance_id", code)
        .eq("assigned_user_id", userId)
        .maybeSingle();

      if (!sRes.error) setMySlot(sRes.data ?? null);
    } catch {}

    // Upcoming events (alliance_events) - best effort (schema varies)
    const now = new Date();
    const take = (rows: any[]) => {
      const parsed = (rows ?? []).map((r) => {
        const d =
          bestDate(r.starts_at) ||
          bestDate(r.start_at) ||
          bestDate(r.start_time) ||
          bestDate(r.starts_on) ||
          bestDate(r.date) ||
          bestDate(r.event_date) ||
          bestDate(r.created_at);

        return { r, d };
      });

      const future = parsed
        .filter((x) => x.d && x.d.getTime() >= now.getTime() - 60000)
        .sort((a, b) => (a.d!.getTime() - b.d!.getTime()))
        .slice(0, 3)
        .map((x) => ({ ...x.r, _when: x.d }));

      setUpcoming(future);
    };

    try {
      // attempt alliance_code
      const e1 = await supabase.from("alliance_events").select("*").eq("alliance_code", code).limit(50);
      if (!e1.error) { take(e1.data ?? []); return; }
    } catch {}

    try {
      // attempt alliance_id as text code
      const e2 = await supabase.from("alliance_events").select("*").eq("alliance_id", code).limit(50);
      if (!e2.error) { take(e2.data ?? []); return; }
    } catch {}

    // fallback none
    setUpcoming([]);
  };

  const loadFeed = async (allianceCode: string) => {
    const code = upper(allianceCode);
    if (!code) {
      setAnnouncements([]);
      setSections([]);
      return;
    }

    // Announcements preview
    const aRes = await supabase
      .from("alliance_announcements")
      .select("id,alliance_code,title,body,pinned,created_at")
      .eq("alliance_code", code)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (!aRes.error) setAnnouncements((aRes.data ?? []) as any);

    // Guides preview
    const gRes = await supabase
      .from("guide_sections")
      .select("id,alliance_code,title,updated_at")
      .eq("alliance_code", code)
      .order("updated_at", { ascending: false })
      .limit(6);

    if (!gRes.error) setSections((gRes.data ?? []) as any);

    await loadLiveCards(code);
  };

  useEffect(() => {
    loadBasics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedAlliance) return;
    loadFeed(selectedAlliance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlliance, userId]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>🧍‍♂️ Your Dashboard (ME)</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/owner" style={{ opacity: 0.85 }}>Owner</Link>
          <Link to="/owner/assignments" style={{ opacity: 0.85 }}>Assign Players</Link>
          <Link to="/state" style={{ opacity: 0.85 }}>State</Link>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {memberships.length === 0 ? (
        <div style={{ marginTop: 14, opacity: 0.85 }}>
          You are not assigned to any alliance yet. Ask your Owner/R4/R5 to assign you.
        </div>
      ) : (
        <>
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ opacity: 0.8 }}>Alliance</span>
              <select value={selectedAlliance} onChange={(e) => pickAlliance(e.target.value)}>
                {memberships.map((m) => (
                  <option key={m.alliance_code} value={m.alliance_code}>
                    {m.alliance_code}{m.role ? ` (${String(m.role)})` : ""}
                  </option>
                ))}
              </select>
            </label>

            {selectedAlliance ? (
              <>
                <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}/announcements`} style={{ opacity: 0.9 }}>
                  Announcements
                </Link>

                <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}/guides`} style={{ opacity: 0.9 }}>
                  Guides
                </Link>

                <Link
                  to={`/dashboard/${encodeURIComponent(selectedAlliance)}/hq-map${isManager ? "" : "?view=1"}`}
                  style={{ opacity: 0.9 }}
                >
                  HQ Map {isManager ? "" : "(View)"}
                </Link>

                <Link
                  to={`/dashboard/${encodeURIComponent(selectedAlliance)}/calendar${isManager ? "" : "?view=1"}`}
                  style={{ opacity: 0.9 }}
                >
                  Calendar {isManager ? "" : "(View)"}
                </Link>

                {isManager ? (
                  <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}`} style={{ fontWeight: 900 }}>
                    ⚔️ Manage Alliance Dashboard
                  </Link>
                ) : null}
              </>
            ) : null}
          </div>

          {/* Profile + HQs */}
          {userId && playerId && selectedAlliance ? (
            <div style={{ marginTop: 14 }}>
              <PlayerAllianceProfilePanel
                allianceCode={selectedAlliance}
                userId={userId}
                playerId={playerId}
                role={role}
              />
            </div>
          ) : null}

          {/* Live cards */}
          <div style={{ marginTop: 14, display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>🏰 My HQs</div>
              {myHqs.length === 0 ? (
                <div style={{ marginTop: 10, opacity: 0.75 }}>No HQs saved for this alliance yet.</div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {myHqs.slice(0, 4).map((h: any) => (
                    <div key={String(h.id ?? h.hq_name ?? Math.random())} style={{ opacity: 0.9 }}>
                      • {h.hq_name || "HQ"} {h.hq_level ? `(Lv ${h.hq_level})` : ""} {h.coord_x != null && h.coord_y != null ? `— (${h.coord_x}, ${h.coord_y})` : ""}
                    </div>
                  ))}
                  {myHqs.length > 4 ? <div style={{ opacity: 0.7 }}>…and {myHqs.length - 4} more</div> : null}
                </div>
              )}
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>🗺️ My HQ Slot</div>
              {!mySlot ? (
                <div style={{ marginTop: 10, opacity: 0.75 }}>No slot assignment found (yet).</div>
              ) : (
                <div style={{ marginTop: 10, opacity: 0.9 }}>
                  Slot #{mySlot.slot_number ?? "—"} • Grid ({mySlot.slot_x ?? "?"},{mySlot.slot_y ?? "?"})<br />
                  {mySlot.label ? <>Label: <b>{String(mySlot.label)}</b></> : null}
                </div>
              )}
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>📅 Upcoming Events</div>
              {upcoming.length === 0 ? (
                <div style={{ marginTop: 10, opacity: 0.75 }}>No upcoming events found (or access blocked).</div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {upcoming.map((e: any) => (
                    <div key={String(e.id ?? e.title ?? Math.random())} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 800 }}>{e.title || e.name || "Event"}</div>
                      <div style={{ opacity: 0.85 }}>
                        {fmt(e._when || null)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedAlliance ? (
                <div style={{ marginTop: 10 }}>
                  <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}/calendar${isManager ? "" : "?view=1"}`}>Open calendar</Link>
                </div>
              ) : null}
            </div>
          </div>

          {/* Feed cards */}
          <div style={{ marginTop: 14, display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>📣 Latest Announcements</div>
              {announcements.length === 0 ? (
                <div style={{ marginTop: 10, opacity: 0.75 }}>No announcements yet.</div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {announcements.map((a) => (
                    <div key={a.id} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 800 }}>
                        {a.title || "Announcement"} {a.pinned ? "📌" : ""}
                      </div>
                      <div style={{ opacity: 0.85, whiteSpace: "pre-wrap" }}>
                        {(a.body || "").slice(0, 220)}{(a.body || "").length > 220 ? "…" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedAlliance ? (
                <div style={{ marginTop: 10 }}>
                  <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}/announcements`}>View all</Link>
                </div>
              ) : null}
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>📓 Latest Guides</div>
              {sections.length === 0 ? (
                <div style={{ marginTop: 10, opacity: 0.75 }}>No guide sections yet.</div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {sections.map((s) => (
                    <div key={s.id} style={{ opacity: 0.9 }}>
                      • {s.title || "Untitled"}
                    </div>
                  ))}
                </div>
              )}
              {selectedAlliance ? (
                <div style={{ marginTop: 10 }}>
                  <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}/guides`}>Open guides</Link>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Tip: Everyone uses <b>/me</b>. Owners/R4/R5 also get a “Manage Alliance Dashboard” link.
          </div>
        </>
      )}
    </div>
  );
}
