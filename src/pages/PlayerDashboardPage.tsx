import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import PlayerHqsPanel from "../components/player/PlayerHqsPanel";
import PlayerDashboardPolish from "../components/player/PlayerDashboardPolish";
import PlayerProfilePanel from "../components/player/PlayerProfilePanel";
import PlayerHqsPanel from "../components/player/PlayerHqsPanel";
import AllianceSwitcherCards from "../components/player/AllianceSwitcherCards";

type PlayerAllianceRow = {
  alliance_code: string;
  role?: string | null;
};

export default function PlayerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [uid, setUid] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [alliances, setAlliances] = useState<PlayerAllianceRow[]>([]);

  const allianceCodes = useMemo(
    () => Array.from(new Set((alliances || []).map((a) => String(a.alliance_code || "").toUpperCase()).filter(Boolean))),
    [alliances]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const { data: uRes } = await supabase.auth.getUser();
        const u = uRes?.user ?? null;
        const _uid = u?.id ?? null;

        if (cancelled) return;

        setUid(_uid);

        if (!_uid) {
          setLoading(false);
          return;
        }

        const { data: player, error: pErr } = await supabase
          .from("players")
          .select("id")
          .eq("auth_user_id", _uid)
          .maybeSingle();

        if (pErr) {
          setErr(pErr.message);
          setLoading(false);
          return;
        }

        const pid = (player as any)?.id ?? null;
        setPlayerId(pid);

        if (!pid) {
          setAlliances([]);
          setLoading(false);
          return;
        }

        const { data: pa, error: paErr } = await supabase
          .from("player_alliances")
          .select("alliance_code,role")
          .eq("player_id", pid)
          .order("alliance_code", { ascending: true });

        if (paErr) {
          setErr(paErr.message);
          setLoading(false);
          return;
        }

        setAlliances((pa || []) as PlayerAllianceRow[]);
        setLoading(false);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading your dashboard…</div>;

  if (!uid) {
    return (
      <div style={{ padding: 16 }}>
        {/* Player Dashboard: Alliance Switcher + Live Cards */}
        <AllianceSwitcherCards />
      <div style={{ padding: 16 }}>  <PlayerDashboardPolish />
      {/* --- BEGIN PLAYER PROFILE + HQs --- */}
      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <PlayerProfilePanel {...({ allianceCode: (() => {
  const parts = (typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean) : []);
  const di = parts.indexOf("dashboard");
  const code = di >= 0 ? parts[di + 1] : "";
  return String(code || "").trim().toUpperCase();
})() } as any)} />
        <PlayerHqsPanel {...({ allianceCode: (() => {
  const parts = (typeof window !== "undefined" ? window.location.pathname.split("/").filter(Boolean) : []);
  const di = parts.indexOf("dashboard");
  const code = di >= 0 ? parts[di + 1] : "";
  return String(code || "").trim().toUpperCase();
})() } as any)} />
      </div>
      {/* --- END PLAYER PROFILE + HQs --- */}
        <h2>Player Dashboard</h2>
        <div style={{ opacity: 0.85 }}>Please sign in.</div>
        <div style={{ marginTop: 10 }}>
          <Link to="/">Go to Login →</Link>
        </div>
      </div>
    );
  }

  if (!playerId || allianceCodes.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>🧟 Your Dashboard</h2>
        {err ? (
          <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
            <b>Error:</b> {err}
          </div>
        ) : null}

        <div style={{ marginTop: 12, opacity: 0.85 }}>
          You’re signed in, but not assigned to an alliance yet.
        </div>

        <div style={{ marginTop: 12 }}>
          <Link to="/onboarding">Go to Onboarding →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>🧟 Your Dashboard</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link to="/dashboard" style={{ opacity: 0.9 }}>Alliance Dashboard →</Link>
          <Link to="/owner" style={{ opacity: 0.9 }}>Owner Area →</Link>
        </div>
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255,0,0,0.35)", borderRadius: 10 }}>
          <b>Error:</b> {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>🪪 Your Alliances</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {allianceCodes.map((c) => (
              <div key={c} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <b style={{ minWidth: 60 }}>{c}</b>
                <a href={`/dashboard/${encodeURIComponent(c)}`}>Open Dashboard →</a>
                <a href={`/dashboard/${encodeURIComponent(c)}/hq-map`}>HQ Map →</a>
                <a href={`/dashboard/${encodeURIComponent(c)}/calendar`}>Daily Events →</a>
                <a href={`/dashboard/${encodeURIComponent(c)}/guides`}>Guides →</a>
              </div>
            ))}
          </div>
        </div>

        <PlayerHqsPanel userId={uid} allianceCodes={allianceCodes} />
      </div>
    </div>
  );
}




