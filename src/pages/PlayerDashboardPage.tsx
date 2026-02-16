import { supabase } from "../lib/supabase";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useIsAppAdmin } from "../hooks/useIsAppAdmin";

type Membership = { alliance_code: string; role?: string | null };

export default function PlayerDashboardPage() {
  const nav = useNavigate();
  const { isAdmin } = useIsAppAdmin();

  const [loading, setLoading] = useState(true);
  const [gameName, setGameName] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  const allianceCodes = useMemo(
    () =>
      Array.from(
        new Set(
          (memberships || [])
            .map((m) => (m.alliance_code || "").trim())
            .filter(Boolean)
        )
      ),
    [memberships]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (!user) {
          nav("/", { replace: true });
          return;
        }

        const { data: link } = await supabase
          .from("player_auth_links")
          .select("player_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!link?.player_id) {
          nav("/onboarding", { replace: true });
          return;
        }

        const { data: p } = await supabase
          .from("players")
          .select("game_name")
          .eq("id", link.player_id)
          .maybeSingle();

        const { data: mems } = await supabase
          .from("player_alliances")
          .select("alliance_code, role")
          .eq("player_id", link.player_id);

        if (!cancelled) {
          setGameName(p?.game_name ?? null);
          setMemberships((mems as any) ?? []);
        }

        if (!mems || (Array.isArray(mems) && mems.length === 0)) {
          nav("/onboarding", { replace: true });
          return;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nav]);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>My Dashboard</h2>
      <div style={{ opacity: 0.8, marginBottom: 12 }}>
        Player: <strong>{gameName ?? "Unknown"}</strong>
        {isAdmin ? <span style={{ marginLeft: 8 }}>(Admin View)</span> : null}
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>My Alliances</h3>
          {allianceCodes.length === 0 ? (
            <div>None</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {allianceCodes.map((c) => (
                <li key={c}>
                  {c}{" "}
                  <span style={{ opacity: 0.8 }}>
                    (view: <Link to={`/dashboard/${encodeURIComponent(c)}`}>dashboard</Link>)
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>Announcements</h3>
          <div style={{ opacity: 0.8 }}>Next: personalized feed + alliance announcements.</div>
        </div>

        <div style={{ border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: 14 }}>
          <h3 style={{ marginTop: 0 }}>Guides</h3>
          <div style={{ opacity: 0.8 }}>Next: guides for your alliance(s), read-only or discussion threads.</div>
        </div>
      </div>
    </div>
  );
}