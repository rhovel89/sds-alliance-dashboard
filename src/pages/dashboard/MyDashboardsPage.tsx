import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getCanonicalPlayerIdForUser } from "../../utils/getCanonicalPlayerId";

type Membership = { alliance_code: string; role: string | null };

function upper(v: any) {
  return String(v ?? "").trim().toUpperCase();
}

function isManagerRole(role?: string | null) {
  const r = String(role ?? "").toLowerCase();
  return ["owner", "r4", "r5"].includes(r);
}

export default function MyDashboardsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [uid, setUid] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const rtRef = useRef<any>(null);

  const managers = useMemo(() => memberships.filter((m) => isManagerRole(m.role)), [memberships]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const { data: u } = await supabase.auth.getUser();
      const id = u?.user?.id ?? null;

      setUid(id);
      if (!id) {
        setErr("Please sign in.");
        setMemberships([]);
        setPlayerId(null);
        return;
      }

      try {
        const a = await supabase.rpc("is_app_admin");
        if (typeof a.data === "boolean") setIsAdmin(a.data);
      } catch {}

      // Deterministic player row (no auto-create here)
      const pid = await getCanonicalPlayerIdForUser(id);
setPlayerId(pid);

      if (!pid) {
        setMemberships([]);
        return;
      }

      const mRes = await supabase
        .from("player_alliances")
        .select("alliance_code,role")
        .eq("player_id", pid)
        .order("alliance_code", { ascending: true });

      if (mRes.error) throw mRes.error;

      setMemberships(
        (mRes.data ?? []).map((r: any) => ({
          alliance_code: upper(r.alliance_code),
          role: (r.role ?? null) as any,
        }))
      );
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setMemberships([]);
      setPlayerId(null);
    } finally {
      setLoading(false);
    }
  }

  // Initial load + refresh on focus/visibility
  useEffect(() => {
    void load();

    const onFocus = () => void load();
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime refresh for membership changes
  useEffect(() => {
    if (!playerId) return;

    try {
      if (rtRef.current) supabase.removeChannel(rtRef.current);
    } catch {}

    const ch = supabase
      .channel("rt-my-dashboards-" + playerId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_alliances", filter: `player_id=eq.${playerId}` },
        () => { void load(); }
      )
      .subscribe();

    rtRef.current = ch;

    return () => {
      try { supabase.removeChannel(ch); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>📌 My Dashboards</h2>
<div style={{ marginTop: 12, marginBottom: 12 }}>
  <div style={{ fontWeight: 950, marginBottom: 8 }}>State 789 — Live Ops Feed</div>
  <div style={{ opacity: 0.72, fontSize: 12, marginBottom: 10 }}>Realtime intel (threads + achievements). Click to jump.</div>
  <OpsFeedPanel stateCode="789" limit={8} />
</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/" style={{ opacity: 0.85 }}>Home</Link>
          <Link to="/me" style={{ opacity: 0.85 }}>ME</Link>
          {isAdmin ? <Link to="/owner" style={{ opacity: 0.85 }}>Owner</Link> : null}
          <Link to="/state" style={{ opacity: 0.85 }}>State</Link>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 14, display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900 }}>🧍‍♂️ Personal Dashboard</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            Your saved profile + HQs + latest announcements/guides for the alliance you choose.
          </div>
          <div style={{ marginTop: 10 }}>
            <Link to="/me" style={{ fontWeight: 900 }}>Open /me</Link>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 900 }}>🧭 Quick Links</div>

          {memberships.length === 0 ? (
            <div style={{ marginTop: 10, opacity: 0.75 }}>No alliances assigned yet.</div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {memberships.map((m) => {
                const code = upper(m.alliance_code);
                const manager = isManagerRole(m.role);
                const viewSuffix = manager ? "" : "?view=1";

                return (
                  <div key={code} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 900 }}>
                        {code} {m.role ? `(${String(m.role)})` : ""}
                      </div>
                      <Link to={`/me?alliance=${encodeURIComponent(code)}`} style={{ fontWeight: 900 }}>
                        Open in ME
                      </Link>
                    </div>

                    <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Link to={`/dashboard/${encodeURIComponent(code)}/announcements`}>Announcements</Link>
                      <Link to={`/dashboard/${encodeURIComponent(code)}/guides`}>Guides</Link>
                      <Link to={`/dashboard/${encodeURIComponent(code)}/hq-map${viewSuffix}`}>HQ Map</Link>
                      <Link to={`/dashboard/${encodeURIComponent(code)}/calendar${viewSuffix}`}>Calendar</Link>
                      {manager ? <Link to={`/dashboard/${encodeURIComponent(code)}`} style={{ fontWeight: 900 }}>⚔️ Manage</Link> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {managers.length > 0 ? (
          <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 900 }}>⚔️ Alliance Dashboards You Can Manage</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {managers.map((m) => (
                <div key={m.alliance_code} style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 900 }}>{upper(m.alliance_code)}</div>
                    <Link to={`/dashboard/${encodeURIComponent(upper(m.alliance_code))}`} style={{ fontWeight: 900 }}>Open</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}



