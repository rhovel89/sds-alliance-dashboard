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

type AnyEvent = Record<string, any>;

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isManagerRole(role?: string | null) {
  const r = String(role ?? "").toLowerCase();
  return ["owner", "r4", "r5"].includes(r);
}

function pickEventTitle(e: AnyEvent) {
  return String(e?.title ?? e?.name ?? e?.label ?? "Event");
}

function pickEventStart(e: AnyEvent) {
  return (
    e?.starts_at ??
    e?.start_time ??
    e?.start_at ??
    e?.start ??
    e?.date ??
    e?.created_at ??
    null
  );
}

export default function PlayerDashboardPage() {
  const [sp, setSp] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isAppAdmin, setIsAppAdmin] = useState(false);
  const [hasStateRole, setHasStateRole] = useState(false);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedAlliance, setSelectedAlliance] = useState<string>("");

  const role = useMemo(() => {
    const m = memberships.find((x) => upper(x.alliance_code) === upper(selectedAlliance));
    return m?.role ?? null;
  }, [memberships, selectedAlliance]);

  const isManager = useMemo(() => isManagerRole(role), [role]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [sections, setSections] = useState<GuideSection[]>([]);
  const [events, setEvents] = useState<AnyEvent[]>([]);
  const [myHqs, setMyHqs] = useState<any[]>([]);

  const pickAlliance = (code: string) => {
    const c = upper(code);
    setSelectedAlliance(c);
    const next = new URLSearchParams(sp);
    next.set("alliance", c);
    setSp(next, { replace: true });
  };

  const detectStateRole = async (uid: string) => {
    // Best-effort: if table doesn't exist or blocked, we don't crash.
    try {
      const r = await supabase.from("user_state_roles").select("id").eq("user_id", uid).limit(1);
      if (!r.error && (r.data ?? []).length > 0) return true;
    } catch {}
    try {
      // fallback: user_roles with role text like "state_*" (if your schema has it)
      const r2 = await supabase.from("user_roles").select("id,role").eq("user_id", uid).limit(50);
      if (!r2.error) {
        const anyState = (r2.data ?? []).some((x: any) => String(x?.role ?? "").toLowerCase().includes("state"));
        if (anyState) return true;
      }
    } catch {}
    return false;
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

      // admin check (best-effort)
      try {
        const a = await supabase.rpc("is_app_admin");
        if (typeof a.data === "boolean") setIsAppAdmin(a.data);
      } catch {}

      // state role check (best-effort)
      try {
        const sr = await detectStateRole(uid);
        setHasStateRole(sr);
      } catch {}

      // Ensure player row exists (best effort)
      let pid: string | null = null;
      const p1 = await supabase.from("players").select("id").eq("auth_user_id", uid).maybeSingle();
      if (!p1.error && p1.data?.id) {
        pid = String(p1.data.id);
      } else {
        try {
          const ins = await supabase.from("players").insert({ auth_user_id: uid } as any).select("id").maybeSingle();
          if (!ins.error && ins.data?.id) pid = String(ins.data.id);
        } catch {}
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

  const loadEventsPreview = async (code: string) => {
    const c = upper(code);
    if (!c) { setEvents([]); return; }

    // Try alliance_code, then alliance_id (text), then no filter.
    try {
      const q1 = await supabase.from("alliance_events").select("*").eq("alliance_code", c).limit(6);
      if (!q1.error) { setEvents((q1.data ?? []) as any); return; }
    } catch {}

    try {
      const q2 = await supabase.from("alliance_events").select("*").eq("alliance_id", c).limit(6);
      if (!q2.error) { setEvents((q2.data ?? []) as any); return; }
    } catch {}

    // if table missing or schema differs, fail silently
    setEvents([]);
  };

  const loadMyHqsPreview = async (uid: string, allianceCode: string) => {
    const c = upper(allianceCode);
    if (!uid || !c) { setMyHqs([]); return; }

    try {
      const h = await supabase
        .from("player_hqs")
        .select("id,hq_name,hq_level,coord_x,coord_y,created_at")
        .eq("user_id", uid)
        .eq("alliance_id", c)
        .order("created_at", { ascending: true })
        .limit(8);

      if (!h.error) setMyHqs((h.data ?? []) as any);
    } catch {
      setMyHqs([]);
    }
  };

  const loadFeed = async (allianceCode: string) => {
    const code = upper(allianceCode);
    if (!code) {
      setAnnouncements([]);
      setSections([]);
      setEvents([]);
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

    // Events preview (best effort)
    await loadEventsPreview(code);

    // HQs preview (best effort)
    if (userId) await loadMyHqsPreview(userId, code);
  };

  useEffect(() => {
    loadBasics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedAlliance) return;
    loadFeed(selectedAlliance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlliance]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  const canSeeState = isAppAdmin || hasStateRole;

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>🧍‍♂️ Your Dashboard (ME)</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {isAppAdmin ? <Link to="/owner" style={{ opacity: 0.85 }}>Owner</Link> : null}
          {canSeeState ? <Link to="/state" style={{ opacity: 0.85 }}>State</Link> : null}
          <Link to="/dashboard" style={{ opacity: 0.85 }}>Dashboards</Link>
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

            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>🗓️ Upcoming Events</div>
              {events.length === 0 ? (
                <div style={{ marginTop: 10, opacity: 0.75 }}>
                  No upcoming events (or calendar table not available).
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {events.slice(0, 6).map((e: any, idx: number) => (
                    <div key={String(e?.id ?? idx)} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 800 }}>{pickEventTitle(e)}</div>
                      <div style={{ opacity: 0.8, fontSize: 12 }}>
                        {pickEventStart(e) ? String(pickEventStart(e)) : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedAlliance ? (
                <div style={{ marginTop: 10 }}>
                  <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}/calendar${isManager ? "" : "?view=1"}`}>
                    Open calendar
                  </Link>
                </div>
              ) : null}
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>🏰 Your HQs</div>
              {myHqs.length === 0 ? (
                <div style={{ marginTop: 10, opacity: 0.75 }}>
                  No HQs saved yet — add them in your profile panel.
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {myHqs.map((h: any, idx: number) => (
                    <div key={String(h?.id ?? idx)} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontWeight: 800 }}>
                        {String(h?.hq_name ?? "HQ")} {h?.hq_level ? `— L${h.hq_level}` : ""}
                      </div>
                      <div style={{ opacity: 0.85 }}>
                        {(h?.coord_x ?? "") !== "" && (h?.coord_y ?? "") !== "" ? `(${h.coord_x}, ${h.coord_y})` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Tip: Everyone uses <b>/me</b>. Owners/R4/R5 also get the “Manage Alliance Dashboard” link.
          </div>
        </>
      )}
    </div>
  );
}
