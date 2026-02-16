import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

type Membership = { alliance_code: string; role?: string | null };
type Announcement = { id: string; alliance_code: string; title?: string | null; body?: string | null; created_at?: string | null };

export default function PlayerDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsEnabled, setAnnouncementsEnabled] = useState(true);

  const allianceCodes = useMemo(
    () => (memberships || []).map((m) => (m?.alliance_code || "").trim()).filter(Boolean),
    [memberships]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;

        if (!user) { if (!cancelled) setLoading(false); return; }

        const { data: links, error: linkErr } = await supabase
          .from("player_auth_links")
          .select("player_id")
          .eq("user_id", user.id)
          .limit(1);

        if (linkErr) { if (!cancelled) { setErr(linkErr.message || "Failed to load player link."); setLoading(false); } return; }

        const pid = (links && links.length > 0) ? (links[0] as any).player_id : null;
        if (!pid) { navigate("/onboarding", { replace: true }); return; }

        if (!cancelled) setPlayerId(pid);

        const { data: mems, error: memErr } = await supabase
          .from("player_alliances")
          .select("alliance_code, role")
          .eq("player_id", pid);

        if (memErr) { if (!cancelled) { setErr(memErr.message || "Failed to load memberships."); setLoading(false); } return; }

        const memList = (mems as any[]) || [];
        if (!cancelled) setMemberships(memList as any);

        if (memList.length === 0) { if (!cancelled) setLoading(false); return; }

        // Latest announcements (best effort)
        try {
          const codes = memList.map((m) => (m?.alliance_code || "").trim()).filter(Boolean);
          const { data: anns, error: annErr } = await supabase
            .from("alliance_announcements")
            .select("id, alliance_code, title, body, created_at")
            .in("alliance_code", codes)
            .order("created_at", { ascending: false })
            .limit(6);

          if (annErr) {
            if (!cancelled) setAnnouncementsEnabled(false);
          } else {
            if (!cancelled) { setAnnouncementsEnabled(true); setAnnouncements((anns as any[]) || []); }
          }
        } catch { if (!cancelled) setAnnouncementsEnabled(false); }

        if (!cancelled) setLoading(false);
      } catch (e: any) {
        if (!cancelled) { setErr(e?.message || "Unexpected error."); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>🧟 Player Dashboard</h2>
          <div style={{ opacity: 0.8, marginTop: 4 }}>Private to you.</div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Player ID: {playerId ?? "—"}</div>
      </div>

      {err ? (
        <div style={{ padding: 12, border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10 }}>
          <b>Problem:</b> {err}
        </div>
      ) : null}

      <div style={{ padding: 16, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>My Alliances</h3>
        {memberships.length === 0 ? (
          <div style={{ opacity: 0.8 }}>You’re approved, but not assigned to an alliance yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {memberships.map((m, idx) => {
              const code = (m.alliance_code || "").trim();
              const role = (m.role || "").toString();
              const base = `/dashboard/${encodeURIComponent(code)}`;

              return (
                <div key={`${code}-${idx}`} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <b>{code}</b> <span style={{ opacity: 0.75 }}>{role ? `(${role})` : ""}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Link to={base}>Alliance Dashboard</Link>
                    <Link to={`${base}/announcements`}>Announcements</Link>
                    <Link to={`${base}/guides`}>Guides</Link>
                    <Link to={`${base}/hq-map`}>HQ Map (view)</Link>
                    <Link to={`${base}/calendar`}>Calendar (view)</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: 16, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>Latest Announcements</h3>
        {!announcementsEnabled ? (
          <div style={{ opacity: 0.8 }}>Announcements not enabled or not readable yet.</div>
        ) : announcements.length === 0 ? (
          <div style={{ opacity: 0.8 }}>No announcements yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {announcements.map((a) => (
              <div key={a.id} style={{ padding: 12, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <b>{a.title || "Announcement"}</b>
                  <span style={{ opacity: 0.7 }}>{a.alliance_code}</span>
                </div>
                {a.body ? <div style={{ marginTop: 6, opacity: 0.9 }}>{a.body}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: 16, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>HQs</h3>
        <div style={{ opacity: 0.85 }}>
          Placeholder. When you provide HQ schema/fields, we’ll render your HQ cards here.
        </div>
      </div>

      <div style={{ padding: 16, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12 }}>
        <h3 style={{ marginTop: 0 }}>Today’s Events</h3>
        <div style={{ opacity: 0.85 }}>For now link-only (view mode).</div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {allianceCodes.map((c) => (
            <Link key={c} to={`/dashboard/${encodeURIComponent(c)}/calendar`}>
              Open {c} Calendar
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
