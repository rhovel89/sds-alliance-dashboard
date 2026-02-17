import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type AnyRow = Record<string, any>;

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isManagerRole(role: any) {
  const r = String(role ?? "").trim().toLowerCase();
  return r === "owner" || r === "r4" || r === "r5";
}

export default function PlayerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const [memberships, setMemberships] = useState<{ alliance_code: string; role?: string | null }[]>([]);
  const [announcements, setAnnouncements] = useState<AnyRow[]>([]);
  const [guideSections, setGuideSections] = useState<AnyRow[]>([]);

  const allianceCodes = useMemo(
    () => Array.from(new Set((memberships || []).map((m) => upper(m.alliance_code)).filter(Boolean))),
    [memberships]
  );

  const managerAlliances = useMemo(
    () => (memberships || []).filter((m) => isManagerRole(m.role)).map((m) => upper(m.alliance_code)),
    [memberships]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const { data: u, error: uErr } = await supabase.auth.getUser();
        if (uErr) throw uErr;
        const uid = u?.user?.id ?? null;
        if (!uid) {
          setUserId(null);
          setPlayerId(null);
          setMemberships([]);
          setAnnouncements([]);
          setGuideSections([]);
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setUserId(uid);

        // Fetch player id
        const { data: p, error: pErr } = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", uid)
          .maybeSingle();

        if (pErr) throw pErr;
        const pid = (p as any)?.id ?? null;
        setPlayerId(pid);

        if (!pid) {
          // Not forcing onboarding here (safe). Just show a message.
          setMemberships([]);
          setAnnouncements([]);
          setGuideSections([]);
          setLoading(false);
          return;
        }

        // Memberships
        const { data: mem, error: memErr } = await supabase
          .from("player_alliances")
          .select("alliance_code,role")
          .eq("player_id", pid);

        if (memErr) throw memErr;

        const ms = (mem ?? []) as any[];
        const cleaned = ms
          .map((m) => ({ alliance_code: upper(m.alliance_code), role: m.role ?? null }))
          .filter((m) => m.alliance_code);

        setMemberships(cleaned);

        const codes = Array.from(new Set(cleaned.map((m) => m.alliance_code)));
        if (codes.length === 0) {
          setAnnouncements([]);
          setGuideSections([]);
          setLoading(false);
          return;
        }

        // Announcements (grab a pool then group in UI)
        const { data: anns, error: aErr } = await supabase
          .from("alliance_announcements")
          .select("id,alliance_code,title,body,pinned,created_at")
          .in("alliance_code", codes)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(80);

        if (aErr) {
          // don't hard-fail if this table is blocked by RLS; just show no announcements
          setAnnouncements([]);
        } else {
          setAnnouncements((anns ?? []) as AnyRow[]);
        }

        // Guides sections (latest)
        const { data: gs, error: gErr } = await supabase
          .from("guide_sections")
          .select("id,alliance_code,title,updated_at,readonly")
          .in("alliance_code", codes)
          .order("updated_at", { ascending: false })
          .limit(80);

        if (gErr) {
          setGuideSections([]);
        } else {
          setGuideSections((gs ?? []) as AnyRow[]);
        }

        setLoading(false);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading your dashboard…</div>;

  // Not logged in
  if (!userId) {
    return (
      <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>👤 My Dashboard</h2>
        <div style={{ opacity: 0.8 }}>Please sign in to continue.</div>
        <div style={{ marginTop: 12 }}>
          <Link to="/" style={{ textDecoration: "underline" }}>Go to Login</Link>
        </div>
      </div>
    );
  }

  // Logged in but no player row
  if (!playerId) {
    return (
      <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
        <h2 style={{ marginTop: 0 }}>👤 My Dashboard</h2>
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
          <b>Almost there.</b>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Your player profile hasn’t been created yet (players table row missing).
          </div>
          <div style={{ marginTop: 10 }}>
            <Link to="/onboarding" style={{ textDecoration: "underline" }}>
              Go to Onboarding
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const annByAlliance: Record<string, AnyRow[]> = {};
  for (const a of announcements) {
    const code = upper(a?.alliance_code);
    if (!code) continue;
    if (!annByAlliance[code]) annByAlliance[code] = [];
    if (annByAlliance[code].length < 5) annByAlliance[code].push(a);
  }

  const guidesByAlliance: Record<string, AnyRow[]> = {};
  for (const s of guideSections) {
    const code = upper(s?.alliance_code);
    if (!code) continue;
    if (!guidesByAlliance[code]) guidesByAlliance[code] = [];
    if (guidesByAlliance[code].length < 6) guidesByAlliance[code].push(s);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>👤 My Dashboard</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/me" style={{ opacity: 0.9, textDecoration: "underline" }}>Edit My Profile / HQs</Link>
          <button
            onClick={async () => { try { await supabase.auth.signOut(); window.location.href = "/"; } catch {} }}
            style={{ padding: "6px 10px", borderRadius: 10 }}
          >
            Sign out
          </button>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 12 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      {/* Manager dashboards (only if role qualifies) */}
      {managerAlliances.length > 0 ? (
        <div style={{ marginTop: 12, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 800 }}>🔐 Manager Dashboards</div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {managerAlliances.map((code) => (
              <Link
                key={code}
                to={`/dashboard/${encodeURIComponent(code)}`}
                style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)" }}
              >
                {code} (R4/R5/Owner)
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* Alliances overview */}
      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        {allianceCodes.length === 0 ? (
          <div style={{ opacity: 0.8 }}>You are not assigned to any alliances yet.</div>
        ) : (
          allianceCodes.map((code) => {
            const role = memberships.find((m) => upper(m.alliance_code) === code)?.role ?? null;
            const isMgr = isManagerRole(role);

            return (
              <div key={code} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{code}</div>
                    <div style={{ opacity: 0.75, marginTop: 2 }}>
                      Role: <b>{String(role ?? "Member")}</b>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <Link to={`/dashboard/${encodeURIComponent(code)}/guides`} style={{ textDecoration: "underline" }}>
                      Guides
                    </Link>
                    <Link to={`/dashboard/${encodeURIComponent(code)}/hq-map-view`} style={{ textDecoration: "underline" }}>
                      HQ Map (view)
                    </Link>
                    <Link to={`/dashboard/${encodeURIComponent(code)}/calendar-view`} style={{ textDecoration: "underline" }}>
                      Calendar (view)
                    </Link>
                    {isMgr ? (
                      <Link to={`/dashboard/${encodeURIComponent(code)}`} style={{ textDecoration: "underline" }}>
                        Manager Dashboard
                      </Link>
                    ) : null}
                  </div>
                </div>

                {/* Announcements preview */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 800, opacity: 0.9 }}>📢 Announcements</div>
                  {(annByAlliance[code] ?? []).length === 0 ? (
                    <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>No announcements found (or access blocked).</div>
                  ) : (
                    <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      {(annByAlliance[code] ?? []).map((a: any) => (
                        <div key={String(a?.id)} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
                          <div style={{ fontWeight: 800 }}>
                            {String(a?.title ?? "Untitled")}
                            {a?.pinned ? <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.75 }}>(Pinned)</span> : null}
                          </div>
                          {a?.body ? (
                            <div style={{ marginTop: 6, opacity: 0.85, whiteSpace: "pre-wrap" }}>
                              {String(a.body).slice(0, 220)}{String(a.body).length > 220 ? "…" : ""}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Guides preview */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 800, opacity: 0.9 }}>📓 Guides</div>
                  {(guidesByAlliance[code] ?? []).length === 0 ? (
                    <div style={{ marginTop: 6, opacity: 0.7, fontSize: 13 }}>No guide sections found (or access blocked).</div>
                  ) : (
                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      {(guidesByAlliance[code] ?? []).map((s: any) => (
                        <div key={String(s?.id)} style={{ opacity: 0.9 }}>
                          • {String(s?.title ?? "Untitled")}
                          {s?.readonly ? <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>(Read-only)</span> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        Personal dashboard URL: <code>/dashboard/ME</code>
      </div>
    </div>
  );
}
