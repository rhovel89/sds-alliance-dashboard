import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { rbacHasPermission } from "../lib/rbacClient";
import { supabase } from "../lib/supabaseClient";
import PlayerAllianceProfilePanel from "../components/player/PlayerAllianceProfilePanel";

type Membership = { alliance_code: string; role: string | null };

type Announcement = {
  id: string;
  title: string | null;
  body: string | null;
  pinned?: boolean | null;
  created_at?: string | null;
};

type GuideSection = { id: string; title: string | null; updated_at?: string | null };

function upper(v: any) { return String(v ?? "").trim().toUpperCase(); }

function isManagerRole(role?: string | null) {
  const r = String(role ?? "").toLowerCase();
  return ["owner", "r4", "r5"].includes(r);
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

  
  const [canEditHqMap, setCanEditHqMap] = useState(false);
  const [canEditCalendar, setCanEditCalendar] = useState(false);
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
        } catch {}
      }
      setPlayerId(pid);

      // 1) New model memberships
      let ms: Membership[] = [];
      if (pid) {
        const mRes = await supabase
          .from("player_alliances")
          .select("alliance_code,role")
          .eq("player_id", pid)
          .order("alliance_code", { ascending: true });

        if (!mRes.error) {
          ms = (mRes.data ?? []).map((r: any) => ({
            alliance_code: upper(r.alliance_code),
            role: (r.role ?? null) as any,
          })) as Membership[];
        }
      }

      // 2) Fallback old model memberships (alliance_members + alliances.code)
      if (ms.length === 0) {
        try {
          const am = await supabase
            .from("alliance_members")
            .select("alliance_id,role")
            .eq("user_id", uid)
            .limit(200);

          if (!am.error && (am.data?.length ?? 0) > 0) {
            const ids = Array.from(new Set((am.data ?? []).map((x: any) => x.alliance_id).filter(Boolean)));
            if (ids.length > 0) {
              const a = await supabase.from("alliances").select("id,code").in("id", ids as any);
              if (!a.error) {
                const codeById: Record<string, string> = {};
                for (const row of (a.data ?? []) as any[]) codeById[String(row.id)] = upper(row.code);

                ms = (am.data ?? [])
                  .map((r: any) => ({
                    alliance_code: codeById[String(r.alliance_id)] ?? "",
                    role: r.role ?? null,
                  }))
                  .filter((x: any) => x.alliance_code) as Membership[];
              }
            }
          }
        } catch {}
      }

      setMemberships(ms);

      const fromQuery = upper(sp.get("alliance"));
      const initial = fromQuery || ms[0]?.alliance_code || "";
      setSelectedAlliance(initial);

      // If coming from onboarding setup param, ensure we have a selected alliance
      // (does nothing if already set)
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadFeed = async (allianceCode: string) => {
    const code = upper(allianceCode);
    if (!code) { setAnnouncements([]); setSections([]); return; }

    const aRes = await supabase
      .from("alliance_announcements")
      .select("id,alliance_code,title,body,pinned,created_at")
      .eq("alliance_code", code)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (aRes.error) {
      console.error("Announcements error", aRes.error);
      setErr(`Announcements: ${aRes.error.message ?? String(aRes.error)}`);
    } else {
      setAnnouncements((aRes.data ?? []) as any);
    }

    const gRes = await supabase
      .from("guide_sections")
      .select("id,alliance_code,title,updated_at")
      .eq("alliance_code", code)
      .order("updated_at", { ascending: false })
      .limit(6);

    if (gRes.error) {
      console.error("Guides error", gRes.error);
      setErr(`Guides: ${gRes.error.message ?? String(gRes.error)}`);
    } else {
      setSections((gRes.data ?? []) as any);
    }
  };

  useEffect(() => { loadBasics(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (selectedAlliance) loadFeed(selectedAlliance); /* eslint-disable-next-line */ }, [selectedAlliance]);

  useEffect(() => {
    if (!selectedAlliance) return;

    (async () => {
      const hqW = await rbacHasPermission(selectedAlliance, "hq_map.write");
      const calW = await rbacHasPermission(selectedAlliance, "calendar.write");
      setCanEditHqMap(Boolean(hqW) || isManager);
      setCanEditCalendar(Boolean(calW) || isManager);
    })().catch(() => {
      // safe fallback to legacy role logic if RPC not ready
      setCanEditHqMap(isManager);
      setCanEditCalendar(isManager);
    });
  }, [selectedAlliance, isManager]);


  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>🧍‍♂️ Your Dashboard (ME)</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/owner" style={{ opacity: 0.85 }}>Owner</Link>
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
          <b>You are approved, but not assigned to an alliance yet.</b><br />
          Ask your Owner/R4/R5 to assign you to an alliance — then come back to fill out your HQ profile.
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
                <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}/hq-map${canEditHqMap ? "" : "?view=1"}`} style={{ opacity: 0.9 }}>
                  HQ Map {canEditHqMap ? "" : "(View)"}
                </Link>
                <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}/calendar${canEditCalendar ? "" : "?view=1"}`} style={{ opacity: 0.9 }}>
                  Calendar {canEditCalendar ? "" : "(View)"}
                </Link>
                {isManager ? (
                  <>
                    <Link
                      to={`/dashboard/${encodeURIComponent(selectedAlliance)}`}
                      style={{ fontWeight: 900 }}
                    >
                      ⚔️ Manage Alliance Dashboard
                    </Link>

                    <Link
                      to={`/dashboard/${encodeURIComponent(selectedAlliance)}/event-types`}
                      style={{ opacity: 0.9 }}
                    >
                      Event Types
                    </Link>
                  </>
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
              <div style={{ marginTop: 10 }}>
                <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}/announcements`}>View all</Link>
              </div>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 900 }}>📓 Latest Guides</div>
              {sections.length === 0 ? (
                <div style={{ marginTop: 10, opacity: 0.75 }}>No guide sections yet.</div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {sections.map((s) => (
                    <div key={s.id} style={{ opacity: 0.9 }}>• {s.title || "Untitled"}</div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <Link to={`/dashboard/${encodeURIComponent(selectedAlliance)}/guides`}>Open guides</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}



